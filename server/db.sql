CREATE DATABASE IF NOT EXISTS sports_booking;

USE sports_booking;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'staff'
);

CREATE TABLE IF NOT EXISTS `sports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS `courts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sport_id` INT,
  `name` VARCHAR(255) NOT NULL,
  `status` ENUM('Available', 'Booked', 'Under Maintenance') DEFAULT 'Available',
  FOREIGN KEY (`sport_id`) REFERENCES `sports`(`id`)
);

CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `court_id` INT,
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_contact` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `time_slot` VARCHAR(255) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'Booked',
  FOREIGN KEY (`court_id`) REFERENCES `courts`(`id`)
);

-- Insert some sample data

INSERT INTO `users` (username, password) VALUES ('reception', 'password123');

INSERT INTO `sports` (name) VALUES ('Badminton'), ('Turf'), ('Table Tennis'), ('Swimming'), ('Pickleball');

INSERT INTO `courts` (sport_id, name) VALUES 
(1, 'Badminton Court 1'),
(1, 'Badminton Court 2'),
(2, '5v5 Turf 1'),
(3, 'Table Tennis Table 1'),
(4, 'Swimming Lane 1'),
(5, 'Pickleball Court 1');


