# FileX
Web based file browser/simulcast client written in JS + PHP


![FileX Preview](/files/Trash/prev.png)

# Installation
1. Clone the repo into a location of your choice
2. Point any file server running PHP7.0+ to the cloned repo
3. For chromecast (optional):

Chromecast will only stream files with the following headers, therefore you must manually set them on all files in the `/files/` directory:

Access-Control-Allow-Origin: "\*"

Access-Control-Allow-Methods: "GET,PUT,POST,DELETE"

Access-Control-Allow-Headers: "Content-Type"

Access-Control-Expose-Headers: "origin, range"

Cache-Control "public, max-age=3600"

The main page must also be loaded via HTTPS for Chromecast functionality to work

4. For simulcast (optional):

The simulcast feature uses MySQL to store session data, therefore you must first edit `/source/php/connect.php` with the connection parameters of your MySQL server and create a table using the following queries:

```CREATE TABLE `simulcast` (
  `channel` int NOT NULL,
  `url` varchar(1000) DEFAULT NULL,
  `playtime` double NOT NULL,
  `playing` tinyint(1) NOT NULL,
  `speed` float NOT NULL,
  `timestamp` decimal(20,4) NOT NULL,
  `SID` varchar(32) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `simulcast`
  ADD PRIMARY KEY (`channel`);
COMMIT;```
  
