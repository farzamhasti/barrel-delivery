-- Phase 1: Competitor Integration - Minimal Schema

-- Cached competitor data from OpenStreetMap/Overpass API
CREATE TABLE IF NOT EXISTS `competitors` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `osm_id` varchar(50) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `latitude` decimal(10, 6) NOT NULL,
  `longitude` decimal(10, 6) NOT NULL,
  `type` varchar(50) NOT NULL,
  `distance_from_restaurant_km` decimal(10, 2),
  `address` varchar(500),
  `website` varchar(500),
  `phone` varchar(20),
  `opening_hours` varchar(500),
  `cached_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Competitor cache metadata - tracks refresh status and timing
CREATE TABLE IF NOT EXISTS `competitor_cache` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `restaurant_id` varchar(50) NOT NULL,
  `last_refresh_at` timestamp,
  `next_refresh_at` timestamp,
  `total_competitors` int DEFAULT 0,
  `extraction_radius_km` decimal(10, 2) DEFAULT 2,
  `cache_status` varchar(20) DEFAULT 'valid',
  `last_error_message` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Competitor refresh log - audit trail of refresh operations
CREATE TABLE IF NOT EXISTS `competitor_refresh_log` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `restaurant_id` varchar(50) NOT NULL,
  `refresh_timestamp` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `refresh_status` varchar(20) NOT NULL,
  `competitor_count_before` int,
  `competitor_count_after` int,
  `new_competitors_added` int,
  `competitors_removed` int,
  `duration_seconds` int,
  `error_message` text
);
