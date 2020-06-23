<?php
	if ($_SERVER['REQUEST_METHOD'] !== 'POST' || ! count($_FILES['file'])) { // Bad request
		http_response_code(400);
		die();
	}

	include("validate.php");
	
	foreach ($_FILES['file']['tmp_name'] as $key => $tmppath) {
		$dstpath = getPath($_POST['paths'][$key]);
		
		if (validateDst($dstpath)) {
			if (!move_uploaded_file($tmppath, $dstpath)) {
				http_response_code(400);
				die();
			}
		} else {
			http_response_code(400);
			die();
		}		
	}
?>
