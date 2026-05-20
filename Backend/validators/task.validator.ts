import Joi from "joi";

export const createTaskValidator = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    project: Joi.string().hex().length(24).required(),
    assignee: Joi.string().hex().length(24).required(),
    status: Joi.string().valid('todo', 'in-progress', 'in-review', 'done').default('todo'),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    tags: Joi.array().items(Joi.string()).default([]),
    deadline: Joi.date().required(),
    comments: Joi.array().items(Joi.object({
        author: Joi.string().hex().length(24).required(),
        body: Joi.string().required(),
        createdAt: Joi.date().default(Date.now),
    })).default([]),
    fileUrl: Joi.string().optional(),
});

export const updateTaskValidator = Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    project: Joi.string().hex().length(24).optional(),
    assignee: Joi.string().hex().length(24).optional(),
    status: Joi.string().valid('todo', 'in-progress', 'in-review', 'done').optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    deadline: Joi.date().optional(),
    comments: Joi.array().items(Joi.object({
        author: Joi.string().hex().length(24).required(),
        body: Joi.string().required(),
        createdAt: Joi.date().default(Date.now),
    })).optional(),
    fileUrl: Joi.string().optional(),
});

export const updateTaskStatusValidator = Joi.object({
    status: Joi.string().valid('todo', 'in-progress', 'in-review', 'done').required(),
});