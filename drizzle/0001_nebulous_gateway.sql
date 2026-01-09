CREATE TABLE `alert_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`metric` enum('temperature','humidity','vibration','power','pressure','rpm') NOT NULL,
	`minValue` float,
	`maxValue` float,
	`warningMin` float,
	`warningMax` float,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_thresholds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`type` enum('threshold_exceeded','device_offline','firmware_update','maintenance_required','system_error') NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL,
	`metric` varchar(50),
	`value` float,
	`threshold` float,
	`message` text NOT NULL,
	`status` enum('active','acknowledged','resolved') NOT NULL DEFAULT 'active',
	`acknowledgedBy` int,
	`acknowledgedAt` timestamp,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('sensor','actuator','controller','gateway') NOT NULL,
	`status` enum('online','offline','maintenance','error') NOT NULL DEFAULT 'offline',
	`location` varchar(255),
	`zone` varchar(100),
	`firmwareVersion` varchar(50),
	`lastSeen` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `devices_deviceId_unique` UNIQUE(`deviceId`)
);
--> statement-breakpoint
CREATE TABLE `firmware_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`version` varchar(50) NOT NULL,
	`deviceType` enum('sensor','actuator','controller','gateway') NOT NULL,
	`releaseNotes` text,
	`fileUrl` varchar(512),
	`fileSize` int,
	`checksum` varchar(128),
	`isStable` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `firmware_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `firmware_versions_version_unique` UNIQUE(`version`)
);
--> statement-breakpoint
CREATE TABLE `ota_deployments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`firmwareVersionId` int NOT NULL,
	`previousVersion` varchar(50),
	`status` enum('pending','downloading','installing','completed','failed','rolled_back') NOT NULL DEFAULT 'pending',
	`progress` int DEFAULT 0,
	`errorMessage` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ota_deployments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sensor_readings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`temperature` float,
	`humidity` float,
	`vibration` float,
	`power` float,
	`pressure` float,
	`rpm` float,
	`timestamp` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sensor_readings_id` PRIMARY KEY(`id`)
);
