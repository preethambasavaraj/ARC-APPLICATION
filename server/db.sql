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
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS `courts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sport_id` INT,
  `name` VARCHAR(255) NOT NULL,
  `status` ENUM('Available', 'Booked', 'Under Maintenance') DEFAULT 'Available',
    FOREIGN KEY (`sport_id`) REFERENCES `sports`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `court_id` INT,
  `sport_id` INT,
  `created_by_user_id` INT,
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_contact` VARCHAR(255) NOT NULL,
  `customer_email` VARCHAR(255),
  `date` DATE NOT NULL,
  `time_slot` VARCHAR(255) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'Booked',
  `payment_mode` ENUM('cash', 'online'),
  `amount_paid` DECIMAL(10, 2),
    FOREIGN KEY (`sport_id`) REFERENCES `sports`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Insert some sample data

INSERT INTO `users` (username, password) VALUES ('reception', 'password123');

INSERT INTO `sports` (name, price) VALUES ('Badminton', 300), ('Turf', 1200), ('Table Tennis', 150), ('Swimming', 150), ('Pickleball', 400);

INSERT INTO `courts` (sport_id, name) VALUES 
(1, 'Badminton Court 1'),
(1, 'Badminton Court 2'),
(2, '5v5 Turf 1'),
(3, 'Table Tennis Table 1'),
(4, 'Swimming Lane 1'),
(5, 'Pickleball Court 1');



  ALTER TABLE bookings
  ADD COLUMN balance_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending';

  ALTER TABLE bookings
  ADD COLUMN total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

select * from bookings;
select * from courts;

 DELETE FROM bookings WHERE id = 1;
