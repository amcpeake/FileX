<?php
        // You'll have to fill out info for your own MySQL server here:
        $conn = new mysqli(<Server IP>, <username>, <password>, <database>);
        if ($conn->connect_error) {
                http_response_code(500);
                die();
        }

?>
