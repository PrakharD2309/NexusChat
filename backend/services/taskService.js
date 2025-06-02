const Task = require('../models/Task');
const User = require('../models/User');
const Group = require('../models/Group');
const Notification = require('../models/Notification');
const { sendEmail } = require('./emailService');

class TaskService {
  // Create a new task
  async createTask(taskData) {
    const task = new Task({
      ...taskData,
      status: 'pending',
      createdAt: new Date()
    });

    await task.save();

    // Notify assignees
    await this.notifyAssignees(task);

    return task;
  }

  // Get tasks for a user
  async getUserTasks(userId, filters = {}) {
    const query = {
      $or: [
        { assignee: userId },
        { creator: userId }
      ],
      ...filters
    };

    return Task.find(query)
      .populate('creator', 'name avatar')
      .populate('assignee', 'name avatar')
      .populate('group', 'name avatar')
      .sort({ dueDate: 1 });
  }

  // Get tasks for a group
  async getGroupTasks(groupId, filters = {}) {
    const query = {
      group: groupId,
      ...filters
    };

    return Task.find(query)
      .populate('creator', 'name avatar')
      .populate('assignee', 'name avatar')
      .sort({ dueDate: 1 });
  }

  // Update task
  async updateTask(taskId, updates) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    Object.assign(task, updates);
    await task.save();

    // Notify assignee if changed
    if (updates.assignee && updates.assignee.toString() !== task.assignee.toString()) {
      await this.notifyAssignees(task);
    }

    return task;
  }

  // Delete task
  async deleteTask(taskId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    await task.remove();
  }

  // Mark task as complete
  async completeTask(taskId) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();

    // Notify creator
    await this.notifyTaskCompletion(task);

    return task;
  }

  // Add comment to task
  async addComment(taskId, userId, content) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.comments.push({
      user: userId,
      content,
      createdAt: new Date()
    });

    await task.save();

    // Notify task participants
    await this.notifyNewComment(task, userId, content);

    return task;
  }

  // Set task priority
  async setPriority(taskId, priority) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    task.priority = priority;
    await task.save();

    // Notify task participants
    await this.notifyPriorityChange(task);

    return task;
  }

  // Add subtask
  async addSubtask(taskId, subtaskData) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const subtask = new Task({
      ...subtaskData,
      parentTask: taskId,
      group: task.group,
      creator: task.creator
    });

    await subtask.save();

    task.subtasks.push(subtask._id);
    await task.save();

    // Notify assignee
    await this.notifyAssignees(subtask);

    return subtask;
  }

  // Get task statistics
  async getTaskStats(userId) {
    const stats = await Task.aggregate([
      {
        $match: {
          $or: [
            { assignee: userId },
            { creator: userId }
          ]
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    return stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
  }

  // Notify assignees about new task
  async notifyAssignees(task) {
    const assignee = await User.findById(task.assignee);
    if (!assignee) return;

    // Create in-app notification
    const notification = new Notification({
      recipient: task.assignee,
      type: 'task',
      title: 'New Task Assigned',
      content: `You have been assigned to "${task.title}"`,
      data: {
        taskId: task._id
      }
    });

    await notification.save();

    // Send email notification
    await sendEmail({
      to: assignee.email,
      subject: 'New Task Assigned',
      text: `You have been assigned to "${task.title}"`
    });
  }

  // Notify task completion
  async notifyTaskCompletion(task) {
    const creator = await User.findById(task.creator);
    if (!creator) return;

    const notification = new Notification({
      recipient: task.creator,
      type: 'task',
      title: 'Task Completed',
      content: `Task "${task.title}" has been completed`,
      data: {
        taskId: task._id
      }
    });

    await notification.save();
  }

  // Notify new comment
  async notifyNewComment(task, commenterId, content) {
    const participants = new Set([
      task.creator.toString(),
      task.assignee.toString()
    ]);
    participants.delete(commenterId.toString());

    for (const participantId of participants) {
      const notification = new Notification({
        recipient: participantId,
        type: 'task_comment',
        title: 'New Task Comment',
        content: `New comment on task "${task.title}"`,
        data: {
          taskId: task._id
        }
      });

      await notification.save();
    }
  }

  // Notify priority change
  async notifyPriorityChange(task) {
    const notification = new Notification({
      recipient: task.assignee,
      type: 'task_priority',
      title: 'Task Priority Changed',
      content: `Priority of task "${task.title}" has been changed to ${task.priority}`,
      data: {
        taskId: task._id
      }
    });

    await notification.save();
  }
}

module.exports = new TaskService(); 