import LocalSandboxProvider from '@deepseek-ai/dsh-sandbox-local';
import {restrictConfinement} from './network-policy.mjs';
/** Networking from a confined shell needs the host's explicit per-call escalation.
 * Dedicated browser/web/model tools are separate and retain their own policies.
 */
export default class SecondAgentSandbox extends LocalSandboxProvider {
 confine(argv, policy) {
   return restrictConfinement(super.confine(argv, policy));
 }
}
