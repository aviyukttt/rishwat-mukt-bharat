CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trackingId` varchar(32) NOT NULL,
	`anonymous` int NOT NULL DEFAULT 0,
	`phoneHash` varchar(64),
	`agencyIndex` int NOT NULL,
	`agencyName` varchar(255) NOT NULL,
	`stateOrUt` varchar(128),
	`payload` text NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'received',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`),
	CONSTRAINT `complaints_trackingId_unique` UNIQUE(`trackingId`)
);
--> statement-breakpoint
CREATE TABLE `otp_challenges` (
	`id` varchar(36) NOT NULL,
	`phoneHash` varchar(64) NOT NULL,
	`codeHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(16) NOT NULL DEFAULT 'user';