CREATE TABLE `proofbuy_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` varchar(64) NOT NULL,
	`proposalId` varchar(36) NOT NULL,
	`eventType` varchar(48) NOT NULL,
	`message` text NOT NULL,
	`metadata` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `proofbuy_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proofbuy_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` varchar(64) NOT NULL,
	`maxSpendCents` int NOT NULL DEFAULT 5000,
	`allowedRecipients` json NOT NULL,
	`destinationNetwork` varchar(32) NOT NULL DEFAULT 'base-sepolia',
	`requireHumanApproval` boolean NOT NULL DEFAULT true,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `proofbuy_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `proofbuy_policies_workspace_unique` UNIQUE(`workspaceId`)
);
--> statement-breakpoint
CREATE TABLE `proofbuy_proposals` (
	`id` varchar(36) NOT NULL,
	`workspaceId` varchar(64) NOT NULL,
	`vendor` varchar(120) NOT NULL,
	`recipient` varchar(96) NOT NULL,
	`amountCents` int NOT NULL,
	`currency` varchar(12) NOT NULL DEFAULT 'USDC',
	`destinationNetwork` varchar(32) NOT NULL,
	`purpose` text NOT NULL,
	`status` varchar(32) NOT NULL,
	`decision` varchar(16) NOT NULL,
	`policyVersion` int NOT NULL,
	`policySnapshot` json NOT NULL,
	`ruleResults` json NOT NULL,
	`approvedAt` timestamp,
	`approvedBy` varchar(80),
	`executionReference` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `proofbuy_proposals_id` PRIMARY KEY(`id`)
);
