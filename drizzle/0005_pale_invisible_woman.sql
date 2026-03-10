CREATE TABLE `product_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promotionId` int NOT NULL,
	`promoterId` int NOT NULL,
	`parentId` int NOT NULL,
	`productId` int NOT NULL,
	`creditAmount` decimal(10,2) NOT NULL DEFAULT '25.00',
	`status` enum('pending','paid') NOT NULL DEFAULT 'pending',
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_promotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promoterId` int NOT NULL,
	`parentId` int NOT NULL,
	`productId` int NOT NULL,
	`message` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_promotions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(10,2),
	`category` varchar(100),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
