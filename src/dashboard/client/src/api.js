export async function api(path, options) {
    const response = await fetch(path, options);
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Request failed.');
    }
    return response.status === 204 ? null : response.json();
}
