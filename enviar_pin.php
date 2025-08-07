<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Cargar configuración externa
$config = include __DIR__ . '/.env.php';
$apiKey = $config['brevo_api_key'];

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['email']) || !isset($data['pin'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Faltan datos o JSON inválido']);
    exit;
}

$email = trim($data['email']);
$pin = trim($data['pin']);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email inválido']);
    exit;
}

if (!preg_match('/^\d{5}$/', $pin)) {
    http_response_code(400);
    echo json_encode(['error' => 'PIN inválido']);
    exit;
}

$fromName = 'Inventario de Medicamentos';
$fromEmail = 'jano.aguiar@moddatech.com';

$payload = json_encode([
    'sender' => ['name' => $fromName, 'email' => $fromEmail],
    'to' => [['email' => $email]],
    'subject' => 'Tu PIN de acceso',
    'htmlContent' => "<p>Tu PIN de acceso es: <strong>$pin</strong></p>"
]);

$ch = curl_init('https://api.brevo.com/v3/smtp/email');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'accept: application/json',
    'api-key: ' . $apiKey,
    'content-type: application/json'
]);

$response = curl_exec($ch);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['error' => 'Error CURL: ' . curl_error($ch)]);
    curl_close($ch);
    exit;
}

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
    echo json_encode(['success' => true, 'message' => 'PIN enviado correctamente']);
} else {
    http_response_code(500);
    echo json_encode([
        'error' => 'Error enviando el email',
        'status' => $httpCode,
        'response' => $response
    ]);
}
exit;