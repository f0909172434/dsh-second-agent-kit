/** Add outbound process restrictions to an existing macOS Seatbelt profile.
 * Preserve every upstream filesystem rule and fail closed on unknown runners.
 */
export function restrictConfinement(result) {
 const argv = [...result.argv];
 if (!['/usr/bin/sandbox-exec','sandbox-exec'].includes(argv[0]) || argv[1] !== '-p' || typeof argv[2] !== 'string')
   throw new Error('SECOND_AGENT_SANDBOX_UNSUPPORTED: expected the native macOS Seatbelt runner');
 argv[0] = '/usr/bin/sandbox-exec'; // do not rely on a caller-controlled PATH
 argv[2] += '\n(deny network*)\n(allow network* (local unix-socket) (remote unix-socket))\n(deny appleevent-send)';
 return {...result, argv};
}
