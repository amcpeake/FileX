<?php
	$reqJson = json_decode(file_get_contents("php://input"));
	if ($_SERVER['REQUEST_METHOD'] !== 'POST' || ! (isset($reqJson -> oldpath) && isset($reqJson -> newpath))) { // Bad request
		http_response_code(400);
		die();
	}
	
	include("validate.php");

	$oldpath = getPath($reqJson -> oldpath);
	$newpath = getPath($reqJson -> newpath);
	
	if (validateSrc($oldpath) && validateDst($newpath)) {
		if (!rename($oldpath, $newpath)) {
			http_response_code(500);
			die();
		}	
	} else {
		http_response_code(400);
		die();
	}
?>
