<?php
	$root = $_SERVER['DOCUMENT_ROOT'] . "files/";
	$resp = array();
	$resp['used'] = (disk_total_space($root) - disk_free_space($root));
	$resp['free'] = disk_free_space($root);
	$resp['total'] = disk_total_space($root);
	echo json_encode($resp);
?>
