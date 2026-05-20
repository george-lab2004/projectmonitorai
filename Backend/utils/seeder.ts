import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { Project } from "../models/project.model.js";
import { Task } from "../models/task.model.js";
import { Notification } from "../models/notification.model.js";
import { Message } from "../models/message.model.js";
import { runProjectAiAnalysis } from "../ai/ai.auditor.js";

const seed = async () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("Error: MONGO_URI is not defined in environment variables.");
        process.exit(1);
    }

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoUri);
        console.log("Connected successfully!");

        // 1. Clean Database
        console.log("Cleaning database...");
        await User.deleteMany({});
        await Project.deleteMany({});
        await Task.deleteMany({});
        await Notification.deleteMany({});
        await Message.deleteMany({});
        console.log("Cleaned all existing records.");

        // 2. Create Users
        console.log("Hashing password for seeded accounts...");
        const passwordHash = await bcrypt.hash("password123", 10);

        console.log("Seeding 2 Managers...");
        const managersData = [
            {
                name: "Alex Mercer",
                email: "alex.mercer@projectmonitor.ai",
                password: passwordHash,
                avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Alex%20Mercer",
                role: "manager" as const,
                isVerified: true
            },
            {
                name: "Sarah Connor",
                email: "sarah.connor@projectmonitor.ai",
                password: passwordHash,
                avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Sarah%20Connor",
                role: "manager" as const,
                isVerified: true
            }
        ];
        const managers = await User.insertMany(managersData);
        console.log(`Created ${managers.length} managers.`);

        console.log("Seeding 20 Employees...");
        const employeesData: any[] = [];
        const firstNames = ["James", "Emma", "Liam", "Olivia", "Noah", "Ava", "Oliver", "Sophia", "Elijah", "Isabella", "William", "Mia", "Jameson", "Charlotte", "Benjamin", "Amelia", "Lucas", "Harper", "Henry", "Evelyn"];
        const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

        for (let i = 1; i <= 20; i++) {
            const firstName = firstNames[i - 1] || "Employee";
            const lastName = lastNames[i - 1] || `${i}`;
            const fullName = `${firstName} ${lastName}`;
            employeesData.push({
                name: fullName,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@projectmonitor.ai`,
                password: passwordHash,
                avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
                role: "member" as const,
                isVerified: true
            });
        }
        const employees = await User.insertMany(employeesData);
        console.log(`Created ${employees.length} employees.`);

        // 3. Seeding 5 Projects
        console.log("Seeding 5 Projects...");
        const m1 = (managers[0] as any)._id;
        const m2 = (managers[1] as any)._id;

        const eIds = employees.map(e => (e as any)._id);

        const projectsData = [
            {
                title: "Enterprise ERP Portal",
                description: "Overhaul of the central resource planning platform to support multi-region operations.",
                status: "active",
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                color: "#4F46E5",
                icon: "briefcase",
                healthScore: 100,
                aiSummary: "Pending initial audit.",
                aiGenerated: false,
                aiRunsToday: 0,
                manager: m1,
                members: [eIds[0]!, eIds[1]!, eIds[2]!, eIds[3]!, eIds[4]!]
            },
            {
                title: "Mobile Health Tracker",
                description: "iOS and Android apps to track developer activity, wellness, and mental fatigue scores.",
                status: "on-track",
                deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
                color: "#10B981",
                icon: "heart",
                healthScore: 100,
                aiSummary: "Pending initial audit.",
                aiGenerated: false,
                aiRunsToday: 0,
                manager: m1,
                members: [eIds[5]!, eIds[6]!, eIds[7]!, eIds[8]!, eIds[9]!]
            },
            {
                title: "AI Recommendation Engine",
                description: "Deep learning model pipeline for serving real-time user matching predictions.",
                status: "at-risk",
                deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
                color: "#F59E0B",
                icon: "cpu",
                healthScore: 100,
                aiSummary: "Pending initial audit.",
                aiGenerated: false,
                aiRunsToday: 0,
                manager: m2,
                members: [eIds[10]!, eIds[11]!, eIds[12]!, eIds[13]!, eIds[14]!]
            },
            {
                title: "Fintech API Gateway",
                description: "High-throughput and compliant API gateway for third-party billing networks.",
                status: "delayed",
                deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Overdue deadline
                color: "#EF4444",
                icon: "shield",
                healthScore: 100,
                aiSummary: "Pending initial audit.",
                aiGenerated: false,
                aiRunsToday: 0,
                manager: m2,
                members: [eIds[15]!, eIds[16]!, eIds[17]!, eIds[18]!, eIds[19]!]
            },
            {
                title: "Smart City IoT Dashboard",
                description: "Real-time telemetry analytics interface for monitoring urban traffic grid networks.",
                status: "planning",
                deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
                color: "#3B82F6",
                icon: "globe",
                healthScore: 100,
                aiSummary: "Pending initial audit.",
                aiGenerated: false,
                aiRunsToday: 0,
                manager: m1,
                members: [eIds[0]!, eIds[1]!, eIds[2]!, eIds[5]!, eIds[6]!]
            }
        ];
        const projects = await Project.insertMany(projectsData);
        console.log(`Created ${projects.length} projects.`);

        // 4. Seeding Tasks per Project
        console.log("Seeding Tasks...");
        const tasksData: any[] = [];

        // Project 1 (ERP Portal) Tasks - Active
        tasksData.push(
            {
                title: "Design Database Schemas",
                description: "Draw up migration plans and entity relation diagrams for Postgres schema updates.",
                project: projects[0]!._id,
                assignee: eIds[0]!,
                status: "done",
                priority: "high",
                deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            },
            {
                title: "Setup Auth Middleware",
                description: "Integrate OAuth 2.0 client authentication protocols.",
                project: projects[0]!._id,
                assignee: eIds[0]!,
                status: "in-progress",
                priority: "medium",
                deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
            },
            {
                title: "Setup Redis Cache Store",
                description: "Configure distributed key-value storage for faster user sessions.",
                project: projects[0]!._id,
                assignee: eIds[1]!,
                status: "todo",
                priority: "low",
                deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
            },
            {
                title: "Perform Security Audit",
                description: "Identify any vulnerability gaps in internal microservices.",
                project: projects[0]!._id,
                assignee: eIds[0]!,
                status: "todo",
                priority: "high",
                deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // OVERDUE
            }
        );

        // Project 2 (Health Tracker) Tasks
        tasksData.push(
            {
                title: "Configure Apple HealthKit",
                description: "Wire app telemetry endpoints directly to iOS health data logs.",
                project: projects[1]!._id,
                assignee: eIds[5]!,
                status: "done",
                priority: "high",
                deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                title: "Android Google Fit Sync",
                description: "Implement background sync protocols for Google Fit metrics.",
                project: projects[1]!._id,
                assignee: eIds[6]!,
                status: "in-progress",
                priority: "medium",
                deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000)
            }
        );

        // Project 3 (AI Recommendation) Tasks - High overdue counts (At Risk)
        tasksData.push(
            {
                title: "Train Baseline PyTorch Model",
                description: "Evaluate matching accuracy using initial training datasets.",
                project: projects[2]!._id,
                assignee: eIds[10]!,
                status: "in-progress",
                priority: "high",
                deadline: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // OVERDUE
            },
            {
                title: "Deploy Inference Endpoints",
                description: "Build FastAPI endpoints to host trained PyTorch prediction models.",
                project: projects[2]!._id,
                assignee: eIds[11]!,
                status: "todo",
                priority: "medium",
                deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // OVERDUE
            },
            {
                title: "Establish Monitoring Dashboards",
                description: "Monitor inference request latency metrics using Prometheus.",
                project: projects[2]!._id,
                assignee: eIds[12]!,
                status: "todo",
                priority: "low",
                deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
            }
        );

        // Project 4 (Fintech Gateway) Tasks - Heavy overdue and delayed (Delayed status)
        tasksData.push(
            {
                title: "Compliance Documentation",
                description: "Ensure gateway follows PCI-DSS network security criteria.",
                project: projects[3]!._id,
                assignee: eIds[15]!,
                status: "todo",
                priority: "high",
                deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // OVERDUE
            },
            {
                title: "Mock Payment Provider Integration",
                description: "Integrate sandboxed environment API tokens for mock test cases.",
                project: projects[3]!._id,
                assignee: eIds[16]!,
                status: "in-review",
                priority: "medium",
                deadline: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) // OVERDUE
            }
        );

        // Project 5 (Smart City) Tasks - Planning phase, assign multiple tasks to employees[0] to overload them
        tasksData.push(
            {
                title: "Telemetry Ingestion Pipelines",
                description: "Set up Apache Kafka topics for ingesting traffic signal signals.",
                project: projects[4]!._id,
                assignee: eIds[0]!,
                status: "todo",
                priority: "high",
                deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
            },
            {
                title: "Draft Interface Wireframes",
                description: "Sketch UI pages for showing live telemetry status feeds.",
                project: projects[4]!._id,
                assignee: eIds[0]!,
                status: "todo",
                priority: "low",
                deadline: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000)
            },
            {
                title: "Database Cluster Configuration",
                description: "Configure MongoDB Atlas sharded cluster layouts.",
                project: projects[4]!._id,
                assignee: eIds[0]!,
                status: "todo",
                priority: "medium",
                deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
            },
            {
                title: "Setup API Documentation Router",
                description: "Setup Swagger UI pages for external developer access endpoints.",
                project: projects[4]!._id,
                assignee: eIds[0]!,
                status: "todo",
                priority: "low",
                deadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000)
            }
        );

        await Task.insertMany(tasksData);
        console.log(`Seeded all project tasks.`);

        // 5. Run AI Analysis trigger manually for all 5 projects
        console.log("Triggering Proactive AI Auditor for all 5 seeded projects...");
        for (const project of projects) {
            if (!project) continue;
            console.log(`Running manual AI audit for: "${project.title}"...`);
            const auditResult = await runProjectAiAnalysis(project._id.toString());
            console.log(`AI audit results saved for "${project.title}":`, {
                healthScore: auditResult.healthScore,
                aiSummary: auditResult.aiSummary,
                aiRunsToday: auditResult.aiRunsToday
            });
        }

        console.log("Data Seeder executed successfully! Clean database is loaded.");
        process.exit(0);
    } catch (err: any) {
        console.error("Seeder failed with error:", err?.message || err);
        process.exit(1);
    }
};

seed();
