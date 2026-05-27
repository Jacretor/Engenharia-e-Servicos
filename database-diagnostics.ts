import dns from 'dns';
import { URL } from 'url';

interface DiagnosticResult {
  isOnline: boolean;
  hostname?: string;
  dnsAddress?: string;
  reason?: string;
  errorCode?: string;
  errorDetails?: any;
}

/**
 * Validates and runs deep diagnostics on a Supabase URL and Key
 * to proactively detect connection failures, DNS lookups issues,
 * format mismatches, and offline states.
 */
export async function runDatabaseDiagnostics(
  supabaseUrl: string,
  supabaseKey: string
): Promise<DiagnosticResult> {
  const result: DiagnosticResult = { isOnline: false };

  // 1. Initial Empty Checks
  if (!supabaseUrl || !supabaseKey) {
    result.reason = 'Credentials missing - Supabase URL or Anon key is completely empty.';
    result.errorCode = 'CREDENTIALS_MISSING';
    return result;
  }

  const urlStr = supabaseUrl.trim();
  const keyStr = supabaseKey.trim();

  if (urlStr.includes('placeholder') || keyStr.includes('placeholder')) {
    result.reason = 'Credentials set to placeholder values. Defaulting to Local Fallback mode.';
    result.errorCode = 'CREDENTIALS_PLACEHOLDER';
    return result;
  }

  // 2. Syntax Validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
    result.hostname = parsedUrl.hostname;
  } catch (err: any) {
    result.reason = `Invalid URL format: "${urlStr}". Ensure you include https:// and a valid sub-domain.`;
    result.errorCode = 'INVALID_URL';
    result.errorDetails = err.message || err;
    return result;
  }

  // 3. DNS Lookup Diagnostic
  try {
    console.log(`🔍 [Diagnostics] Realizando resolução DNS para o host: "${parsedUrl.hostname}"...`);
    
    // Use DNS lookup with a 4-second timeout to check if hostname resolves
    const lookupPromise = dns.promises.lookup(parsedUrl.hostname);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DNS Lookup Timeout')), 4000)
    );

    const lookupResult = await Promise.race([lookupPromise, timeoutPromise]);
    result.dnsAddress = lookupResult.address;
    console.log(`📡 [Diagnostics] Resolução DNS concluída com sucesso! Endereço IP: ${lookupResult.address}`);
  } catch (dnsErr: any) {
    const code = dnsErr.code || 'UNKNOWN';
    result.errorCode = code;
    result.errorDetails = dnsErr.message || dnsErr;

    if (code === 'ENOTFOUND') {
      result.reason = `DNS ENOTFOUND: O hostname "${parsedUrl.hostname}" não pôde ser resolvido para nenhum endereço IP. Isto acontece habitualmente quando o URL do Supabase está incorreto, o projeto do Supabase foi pausado ou eliminado, ou quando este servidor não tem acesso à internet.`;
    } else if (code === 'EAI_AGAIN') {
      result.reason = 'DNS EAI_AGAIN: Falha temporária na resolução de nomes do sistema. Verifique a ligação de rede ou a configuração do servidor DNS.';
    } else if (dnsErr.message === 'DNS Lookup Timeout') {
      result.reason = 'DNS TIMEOUT: A resolução de nomes DNS excedeu o limite de 4 segundos. A ligação de rede está extremamente lenta ou instável.';
    } else {
      result.reason = `DNS ERROR: Falha na validação DNS do hostname do Supabase. Erro: ${dnsErr.message || dnsErr}`;
    }

    console.error(`❌ [Diagnostics] FALHA CRÍTICA DNS: ${result.reason}`);
    return result;
  }

  // 4. HTTP Connectivity Ping check
  try {
    const pingUrl = `${parsedUrl.origin}/rest/v1/`;
    console.log(`⚡ [Diagnostics] Efetuando ping HTTP para a API REST do Supabase: "${pingUrl}"...`);
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(pingUrl, {
      method: 'GET',
      headers: {
        'apikey': keyStr,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(id);

    console.log(`🔌 [Diagnostics] Supabase respondeu com código de estado HTTP: ${response.status}`);
    
    // Status 200 (OK), 401 (Unauthorized, but reachable!), 404 (Not Found, but reachable!), 400 etc. are considered online.
    // Basically, any response from the endpoint proves HTTP reachability.
    if (response.status >= 200 && response.status < 500) {
      result.isOnline = true;
      result.reason = 'Ligação validada com sucesso! Supabase online, focado e acessível por HTTP.';
      return result;
    } else {
      result.isOnline = true; // Still online but has a server issue
      result.reason = `Supabase acessível, mas reportou um erro interno no servidor (HTTP ${response.status}).`;
      result.errorCode = `HTTP_${response.status}`;
      return result;
    }
  } catch (httpErr: any) {
    result.isOnline = false;
    result.errorDetails = httpErr.message || httpErr;
    
    if (httpErr.name === 'AbortError') {
      result.reason = 'TIMEOUT HTTP: O pedido de teste ao Supabase expirou após 5 segundos. O servidor remoto está extremamente lento ou os caminhos de rede estão congestionados.';
      result.errorCode = 'HTTP_TIMEOUT';
    } else {
      result.reason = `FALHA DE REDE HTTP: Não foi possível obter uma resposta HTTP do Supabase. Detalhes: ${httpErr.message || httpErr}`;
      result.errorCode = 'HTTP_NETWORK_FAIL';
    }

    console.error(`❌ [Diagnostics] FALHA DE LIGAÇÃO HTTP: ${result.reason}`);
    return result;
  }
}
