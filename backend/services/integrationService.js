const Integration = require('../models/Integration');
const User = require('../models/User');
const Group = require('../models/Group');
const Message = require('../models/Message');
const { sendEmail } = require('./emailService');

class IntegrationService {
  // Connect external app
  async connectApp(userId, appName, credentials) {
    const integration = new Integration({
      user: userId,
      app: appName,
      credentials,
      status: 'active',
      connectedAt: new Date()
    });

    await integration.save();
    return integration;
  }

  // Disconnect external app
  async disconnectApp(userId, appName) {
    const integration = await Integration.findOne({
      user: userId,
      app: appName
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    integration.status = 'disconnected';
    integration.disconnectedAt = new Date();
    await integration.save();

    return integration;
  }

  // Get user's connected apps
  async getUserIntegrations(userId) {
    return Integration.find({
      user: userId,
      status: 'active'
    });
  }

  // Sync data with external app
  async syncData(userId, appName, data) {
    const integration = await Integration.findOne({
      user: userId,
      app: appName,
      status: 'active'
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Update last sync time
    integration.lastSyncedAt = new Date();
    await integration.save();

    // Process data based on app type
    switch (appName) {
      case 'slack':
        return this.syncSlackData(userId, data);
      case 'trello':
        return this.syncTrelloData(userId, data);
      case 'github':
        return this.syncGithubData(userId, data);
      default:
        throw new Error('Unsupported app integration');
    }
  }

  // Sync Slack data
  async syncSlackData(userId, data) {
    const { channels, messages } = data;

    // Sync channels as groups
    for (const channel of channels) {
      const group = await Group.findOneAndUpdate(
        { name: channel.name, type: 'slack' },
        {
          name: channel.name,
          description: channel.topic,
          type: 'slack',
          members: channel.members.map(member => ({
            user: member,
            role: 'member'
          }))
        },
        { upsert: true, new: true }
      );

      // Sync messages
      for (const message of messages) {
        if (message.channel === channel.id) {
          await Message.findOneAndUpdate(
            { externalId: message.id },
            {
              content: message.text,
              sender: userId,
              group: group._id,
              type: 'text',
              externalId: message.id,
              externalData: message
            },
            { upsert: true }
          );
        }
      }
    }
  }

  // Sync Trello data
  async syncTrelloData(userId, data) {
    const { boards, cards } = data;

    // Sync boards as groups
    for (const board of boards) {
      const group = await Group.findOneAndUpdate(
        { name: board.name, type: 'trello' },
        {
          name: board.name,
          description: board.description,
          type: 'trello',
          members: board.members.map(member => ({
            user: member,
            role: 'member'
          }))
        },
        { upsert: true, new: true }
      );

      // Sync cards as messages
      for (const card of cards) {
        if (card.boardId === board.id) {
          await Message.findOneAndUpdate(
            { externalId: card.id },
            {
              content: card.name,
              description: card.description,
              sender: userId,
              group: group._id,
              type: 'trello_card',
              externalId: card.id,
              externalData: card
            },
            { upsert: true }
          );
        }
      }
    }
  }

  // Sync Github data
  async syncGithubData(userId, data) {
    const { repositories, issues } = data;

    // Sync repositories as groups
    for (const repo of repositories) {
      const group = await Group.findOneAndUpdate(
        { name: repo.name, type: 'github' },
        {
          name: repo.name,
          description: repo.description,
          type: 'github',
          members: repo.collaborators.map(collaborator => ({
            user: collaborator,
            role: 'member'
          }))
        },
        { upsert: true, new: true }
      );

      // Sync issues as messages
      for (const issue of issues) {
        if (issue.repositoryId === repo.id) {
          await Message.findOneAndUpdate(
            { externalId: issue.id },
            {
              content: issue.title,
              description: issue.body,
              sender: userId,
              group: group._id,
              type: 'github_issue',
              externalId: issue.id,
              externalData: issue
            },
            { upsert: true }
          );
        }
      }
    }
  }

  // Get integration status
  async getIntegrationStatus(userId, appName) {
    const integration = await Integration.findOne({
      user: userId,
      app: appName
    });

    if (!integration) {
      return { status: 'not_connected' };
    }

    return {
      status: integration.status,
      connectedAt: integration.connectedAt,
      lastSyncedAt: integration.lastSyncedAt
    };
  }

  // Update integration settings
  async updateSettings(userId, appName, settings) {
    const integration = await Integration.findOne({
      user: userId,
      app: appName
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    integration.settings = {
      ...integration.settings,
      ...settings
    };

    await integration.save();
    return integration;
  }

  // Handle webhook from external app
  async handleWebhook(appName, payload) {
    switch (appName) {
      case 'slack':
        return this.handleSlackWebhook(payload);
      case 'trello':
        return this.handleTrelloWebhook(payload);
      case 'github':
        return this.handleGithubWebhook(payload);
      default:
        throw new Error('Unsupported webhook');
    }
  }

  // Handle Slack webhook
  async handleSlackWebhook(payload) {
    const { event, team_id } = payload;
    const integration = await Integration.findOne({
      'credentials.team_id': team_id,
      app: 'slack'
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Process event based on type
    switch (event.type) {
      case 'message':
        await this.syncSlackData(integration.user, {
          channels: [{ id: event.channel }],
          messages: [event]
        });
        break;
      // Add more event types as needed
    }
  }

  // Handle Trello webhook
  async handleTrelloWebhook(payload) {
    const { action, model } = payload;
    const integration = await Integration.findOne({
      'credentials.webhookId': payload.webhookId,
      app: 'trello'
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Process action based on type
    switch (action.type) {
      case 'createCard':
        await this.syncTrelloData(integration.user, {
          boards: [{ id: model.idBoard }],
          cards: [model]
        });
        break;
      // Add more action types as needed
    }
  }

  // Handle Github webhook
  async handleGithubWebhook(payload) {
    const { repository, issue } = payload;
    const integration = await Integration.findOne({
      'credentials.repository': repository.full_name,
      app: 'github'
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    // Process webhook based on event type
    if (issue) {
      await this.syncGithubData(integration.user, {
        repositories: [repository],
        issues: [issue]
      });
    }
  }
}

module.exports = new IntegrationService(); 