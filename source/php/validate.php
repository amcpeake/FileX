<?php
	function validateSrc($filepath, $sub = '') {
		$base = $_SERVER['DOCUMENT_ROOT'] . 'files/' . $sub;
		$real = realpath($filepath);
		return $real && file_exists($filepath) && strncmp($real, $base, strlen($base)) === 0;
	}

	function validateDst($filepath, $sub = '') {
		$base = $_SERVER['DOCUMENT_ROOT'] . 'files/' . $sub;
		$count = preg_match_all("/\//", $filepath, $matches, PREG_OFFSET_CAPTURE);
		while (!realpath($filepath) && $count > 0) {
			$filepath = substr($filepath, 0, $matches[0][$count - 1][1]);
			$count--;
		}
		$filepath = realpath($filepath);
		if (substr($filepath, -1, 1) !== '/') {
			$filepath = $filepath . '/';
		}
		
		return $filepath && strncmp($filepath, $base, strlen($base)) === 0;
	}

	function getPath($filepath) {
		if (!preg_match("/^\/?files\//", $filepath)) {
			$filepath = "files/" . $filepath;
		}
		if (substr($filepath, 0, 1) == '/') {
			$filepath = substr($filepath, 1);
		}

		return $_SERVER['DOCUMENT_ROOT'] . $filepath;
	}
?>
