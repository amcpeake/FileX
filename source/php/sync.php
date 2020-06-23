<?php
	if (session_status() == 1) {
		session_start();
	}

	include("connect.php");
	
	if ($_SERVER['REQUEST_METHOD'] == "GET" && isset($_GET['channel']) && session_regenerate_id(TRUE)) { // Return current state
		header("Cache-Control: no-cache"); // Event stream headers
		header("Content-Type: text/event-stream");
		$sid = session_id();
		session_destroy();

		$arr = [];
		$timestamp = 0.0;

		$sql = $conn -> prepare("SELECT * FROM simulcast WHERE `channel`=? AND `SID` != ? AND `timestamp` != ?");
		while (true) {
			$sql -> bind_param("isd", $_GET['channel'], $sid, $timestamp);
			$sql -> execute();
			$result = $sql -> get_result();

			if ($result -> num_rows == 1) {
				$res = $result -> fetch_array(MYSQLI_ASSOC);
				unset($res['SID']); // Do not return session IDs to the front end
				echo "event: update" . PHP_EOL;
				echo "data: " . json_encode(array_diff_assoc($res, $arr)) . PHP_EOL;
				echo PHP_EOL;
				$arr = $res;
				$timestamp = $arr['timestamp'];
			}
			ob_flush();
		  	flush();	
			usleep(10000);
		}

		
		$sql -> close();
		die();
	} else if ($_SERVER['REQUEST_METHOD'] == "POST") { // Write any changes to DB
		$req = json_decode(file_get_contents("php://input"));
		
		if (isset($req -> channel) && isset($req -> timestamp) && session_id()) {
			$conn -> autocommit(FALSE);
			if (isset($req -> url)) {
				$sql = $conn -> prepare("UPDATE simulcast SET `url`=? WHERE channel = ?");
				$sql -> bind_param("si", $req -> url, $req -> channel);
				$sql -> execute();
			}

			if (isset($req -> playtime) && is_numeric($req -> playtime)) {
				$req -> playtime = (double)$req -> playtime;
				$req -> playtime >= 0 ? $req -> playtime : 0;
				$sql = $conn -> prepare("UPDATE simulcast SET `playtime`=? WHERE channel = ?");
				$sql -> bind_param("di", $req -> playtime, $req -> channel);
				$sql -> execute();
			}

			if (isset($req -> playing) && gettype($req -> playing) == "boolean") {
				$req -> playing = (int)$req -> playing;
				$sql = $conn -> prepare("UPDATE simulcast SET `playing`=? WHERE channel = ?");
				$sql -> bind_param("ii", $req -> playing, $req -> channel);
				$sql -> execute();
			}

			if (isset($req -> speed) && is_numeric($req -> speed)) {
				$req -> speed = (double)$req -> speed;
				$req -> speed >= 0 && $req -> speed <= 20 ? $req -> speed : 1;
				$sql = $conn -> prepare("UPDATE simulcast SET `speed`=? WHERE channel = ?");
				$sql -> bind_param("di", $req -> speed, $req -> channel);
				$sql -> execute();
			}

			$sid = session_id();
			$sql = $conn -> prepare("UPDATE simulcast SET `timestamp`=?, `SID` = ? WHERE channel = ?");
			$sql -> bind_param("dsi", $req -> timestamp, $sid, $req -> channel);
			$sql -> execute();

			if (!$conn -> commit()) {
				http_response_code(500);
			}
			
			$sql -> close();
			$conn -> autocommit(TRUE);
			die();
		}
	}

	http_response_code(400); // Catch all
	die();
?>
