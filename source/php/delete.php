<?php
	$reqJson = json_decode(file_get_contents("php://input"));
	if ($_SERVER['REQUEST_METHOD'] !== 'POST' || ! isset($reqJson -> path)) { // Bad request
		http_response_code(400);
		die();
	}
	
	include("validate.php");
	
	$path = $reqJson -> path;
	
	if (validateSrc(getPath($path), 'Trash/')) { // Delete
		if (!unlink(getPath($path)) && !rmdir(getPath($path))) {
			http_response_code(500);
			die();
		}	
	} else if (validateSrc(getPath($path))) { // Move to Trash
		$trash = "/files/Trash/" . basename($path);
		if (!rename(getPath($path), getPath($trash))) {
			http_response_code(400);
			die();
		}
	} else {
		http_response_code(400);
		die();
	}
?>
