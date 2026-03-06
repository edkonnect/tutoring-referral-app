ALTER TABLE `users` ADD `referralToken` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_referralToken_unique` UNIQUE(`referralToken`);