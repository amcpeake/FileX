<?php
	$reqJson = json_decode(file_get_contents("php://input"));
	if ($_SERVER['REQUEST_METHOD'] !== 'POST' || ! isset($reqJson -> path)) { // Bad request
		http_response_code(400);
		die();
	}
	
	include("validate.php");

	$path = getPath($reqJson -> path);
	
	if (validateDst($path)) {
		if (!mkdir($path, 0755)) {
			http_response_code(500);
			die();
		}
	} else {
		http_response_code(400);
		die();
	}
?>
