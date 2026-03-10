CREATE TABLE `promoter_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promoter_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `promoter_credentials_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `promoter_credentials_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `promoter_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promoter_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `promoter_invites_token_unique` UNIQUE(`token`)
);
