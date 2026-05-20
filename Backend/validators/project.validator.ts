import Joi from "joi";

export const createProjectValidator = Joi.object({
    title: Joi.string().min(3).max(50).required(),
    description: Joi.string().required(),
    status: Joi.string().valid('planning', 'active', 'on-track', 'at-risk', 'delayed', 'completed').default('planning'),
    deadline: Joi.date().required(),
    color: Joi.string().required(),
    icon: Joi.string().required(),
    manager: Joi.string().hex().length(24).optional(),
    members: Joi.array().items(Joi.string().hex().length(24)).optional(),
});

export const updateProjectValidator = Joi.object({
    title: Joi.string().min(3).max(50).optional(),
    description: Joi.string().optional(),
    status: Joi.string().valid('planning', 'active', 'on-track', 'at-risk', 'delayed', 'completed').optional(),
    deadline: Joi.date().optional(),
    color: Joi.string().optional(),
    icon: Joi.string().optional(),
    members: Joi.array().items(Joi.string().hex().length(24)).optional(),
});