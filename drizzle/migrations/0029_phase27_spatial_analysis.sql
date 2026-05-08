-- Phase 27: Advanced GeoMarketing & Spatial Competition Analysis

-- Spatial clusters - grid-based delivery hotspots
CREATE TABLE IF NOT EXISTS `spatial_clusters` (
  `id` int AUTO_INCREMENT NOT NULL,
  `grid_cell_id` varchar(100) NOT NULL UNIQUE,
  `centroid_latitude` decimal(10,6) NOT NULL,
  `centroid_longitude` decimal(10,6) NOT NULL,
  `order_count` int NOT NULL DEFAULT 0,
  `avg_delivery_time_minutes` decimal(10,2),
  `zone_type` varchar(50),
  `competitor_count` int NOT NULL DEFAULT 0,
  `last_updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grid_cell_id` (`grid_cell_id`)
);

-- Growth analysis - periodic scoring and trend analysis
CREATE TABLE IF NOT EXISTS `growth_analysis` (
  `id` int AUTO_INCREMENT NOT NULL,
  `analysis_id` varchar(100) NOT NULL UNIQUE,
  `period_type` varchar(20) NOT NULL,
  `period_start` timestamp NOT NULL,
  `period_end` timestamp NOT NULL,
  `grid_cell_id` varchar(100) NOT NULL,
  `order_count` int DEFAULT 0,
  `growth_score` decimal(10,4),
  `trend` varchar(20),
  `competitor_density` decimal(10,4),
  `efficiency_rating` varchar(20),
  `avg_delivery_time_minutes` decimal(10,2),
  `insights` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `analysis_id` (`analysis_id`),
  KEY `grid_cell_id` (`grid_cell_id`)
);

-- Delivery heatmap data - grid-based density and efficiency
CREATE TABLE IF NOT EXISTS `delivery_heatmap_data` (
  `id` int AUTO_INCREMENT NOT NULL,
  `grid_cell_id` varchar(100) NOT NULL UNIQUE,
  `centroid_latitude` decimal(10,6) NOT NULL,
  `centroid_longitude` decimal(10,6) NOT NULL,
  `order_density` int DEFAULT 0,
  `avg_delivery_time_minutes` decimal(10,2),
  `efficiency_score` decimal(10,4),
  `competitor_count` int DEFAULT 0,
  `is_underserved` boolean DEFAULT false,
  `is_high_competition` boolean DEFAULT false,
  `is_growing_demand` boolean DEFAULT false,
  `last_updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grid_cell_id` (`grid_cell_id`)
);

-- Spatial analysis cache - store latest analysis results
CREATE TABLE IF NOT EXISTS `spatial_analysis_cache` (
  `id` int AUTO_INCREMENT NOT NULL,
  `cache_key` varchar(100) NOT NULL UNIQUE,
  `analysis_type` varchar(50) NOT NULL,
  `analysis_data` text NOT NULL,
  `grid_cell_count` int DEFAULT 0,
  `competitor_count` int DEFAULT 0,
  `analysis_duration_seconds` int,
  `expires_at` timestamp NOT NULL,
  `last_updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cache_key` (`cache_key`)
);

-- Spatial analysis job log - track background job execution
CREATE TABLE IF NOT EXISTS `spatial_analysis_job_log` (
  `id` int AUTO_INCREMENT NOT NULL,
  `job_type` varchar(50) NOT NULL,
  `job_status` varchar(20) NOT NULL,
  `started_at` timestamp,
  `completed_at` timestamp,
  `duration_seconds` int,
  `records_processed` int,
  `error_message` text,
  `next_scheduled_run` timestamp,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `job_type` (`job_type`),
  KEY `job_status` (`job_status`)
);
