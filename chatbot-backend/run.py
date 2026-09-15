"""Explicit proxy policy: bind locally and trust no forwarded headers by default."""
import ipaddress
import os
import uvicorn


def main():
    raw = os.getenv('CHAT_TRUSTED_PROXY_IPS', '')
    trusted = []
    for item in filter(None, raw.split(',')):
        # No wildcard. Exact proxy addresses/CIDRs only; isolate the listener too.
        trusted.append(str(ipaddress.ip_network(item.strip(), strict=False)))
    uvicorn.run('main:app', host=os.getenv('CHAT_BIND_HOST', '127.0.0.1'),
                port=int(os.getenv('PORT', '8000')), workers=1, access_log=False,
                proxy_headers=bool(trusted), forwarded_allow_ips=','.join(trusted),
                limit_concurrency=32, timeout_keep_alive=5)


if __name__ == '__main__':
    main()
