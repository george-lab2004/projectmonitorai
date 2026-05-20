import type { FunctionDeclaration } from "@google/generative-ai";
import { SchemaType } from "@google/generative-ai";

export const functionDefinitions: FunctionDeclaration[] = [
    {
        name: "getProjectList",
        description: "Retrieve a list of all active projects in the system including their names, descriptions, and IDs.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
            required: []
        }
    },
    {
        name: "getOverdueTasks",
        description: "Retrieve all tasks that are overdue (the deadline has passed and the status is not 'done'). Can optionally be filtered by a specific project ID.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                projectId: {
                    type: SchemaType.STRING,
                    description: "Optional 24-character hexadecimal MongoDB ObjectId of the project to filter by."
                }
            },
            required: []
        }
    },
    {
        name: "getProjectStatus",
        description: "Retrieve the task status distribution (counts of tasks marked todo, in-progress, in-review, and done) for a specific project.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                projectId: {
                    type: SchemaType.STRING,
                    description: "The 24-character hexadecimal MongoDB ObjectId of the project."
                }
            },
            required: ["projectId"]
        }
    },
    {
        name: "getTeamWorkload",
        description: "Retrieve active task counts and distribution for all developers/team members assigned to a specific project.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                projectId: {
                    type: SchemaType.STRING,
                    description: "The 24-character hexadecimal MongoDB ObjectId of the project."
                }
            },
            required: ["projectId"]
        }
    },
    {
        name: "getProjectHealth",
        description: "Retrieve the current health score (0-100) and the last AI-generated summary of a specific project.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                projectId: {
                    type: SchemaType.STRING,
                    description: "The 24-character hexadecimal MongoDB ObjectId of the project."
                }
            },
            required: ["projectId"]
        }
    },
    {
        name: "generateProjectHealth",
        description: "Recalculate, update in the database, and return the health score of a specific project based on overdue tasks and delayed parameters.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                projectId: {
                    type: SchemaType.STRING,
                    description: "The 24-character hexadecimal MongoDB ObjectId of the project."
                }
            },
            required: ["projectId"]
        }
    },
    {
        name: "getMemberPerformance",
        description: "Retrieve productivity metrics (completed tasks, delayed tasks, and total assignments) for a specific developer/team member.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                memberId: {
                    type: SchemaType.STRING,
                    description: "The 24-character hexadecimal MongoDB ObjectId of the team member (user)."
                },
                projectId: {
                    type: SchemaType.STRING,
                    description: "Optional project ID to filter the performance data."
                }
            },
            required: ["memberId"]
        }
    },
    {
        name: "getTeamPerformance",
        description: "Retrieve consolidated productivity and performance metrics for the entire project team.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                projectId: {
                    type: SchemaType.STRING,
                    description: "The 24-character hexadecimal MongoDB ObjectId of the project."
                }
            },
            required: ["projectId"]
        }
    },
    {
        name: "getRiskAlerts",
        description: "Identify high-risk items (overdue tasks, blocked issues, approaching deadlines) for a specific project or globally.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                projectId: {
                    type: SchemaType.STRING,
                    description: "Optional 24-character hexadecimal MongoDB ObjectId of the project to filter by."
                }
            },
            required: []
        }
    },
    {
        name: "getWorkloadAlerts",
        description: "Flag developers who are overloaded with too many active/in-progress tasks (e.g. > 5 active tasks).",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                projectId: {
                    type: SchemaType.STRING,
                    description: "Optional 24-character hexadecimal MongoDB ObjectId of the project to filter by."
                }
            },
            required: []
        }
    },
    {
        name: "getUserList",
        description: "Retrieve a list of all users/developers in the system including their names, emails, roles, and MongoDB IDs.",
        parameters: {
            type: SchemaType.OBJECT,
            properties: {},
            required: []
        }
    }
];