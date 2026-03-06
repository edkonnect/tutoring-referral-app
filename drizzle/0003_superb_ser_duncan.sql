CREATE TABLE `referral_link_visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promoterId` int NOT NULL,
	`visitedAt` timestamp NOT NULL DEFAULT (now()),
	`userAgent` varchar(512),
	`ipAddress` varchar(64),
	CONSTRAINT `referral_link_visits_id` PRIMARY KEY(`id`)
);
