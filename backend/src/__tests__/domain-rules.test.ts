import { domainRulesService } from '../services/domain-rules';
import { getDatabase, closeDatabase } from '../db';

describe('DomainRulesService', () => {
  beforeAll(() => {
    getDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('should check allowlist correctly', async () => {
    await domainRulesService.addRule({
      domain: 'trusted.com',
      type: 'allow',
      source: 'test',
      addedAt: new Date().toISOString(),
    });

    const isAllowed = await domainRulesService.isOnAllowlist('trusted.com');
    expect(isAllowed).toBe(true);

    const isNotAllowed = await domainRulesService.isOnAllowlist('untrusted.com');
    expect(isNotAllowed).toBe(false);
  });

  it('should check blocklist correctly', async () => {
    await domainRulesService.addRule({
      domain: 'malicious.com',
      type: 'block',
      source: 'test',
      addedAt: new Date().toISOString(),
    });

    const isBlocked = await domainRulesService.isOnBlocklist('malicious.com');
    expect(isBlocked).toBe(true);

    const isNotBlocked = await domainRulesService.isOnBlocklist('safe.com');
    expect(isNotBlocked).toBe(false);
  });

  it('should handle wildcard domains', async () => {
    await domainRulesService.addRule({
      domain: '*.wildcard.com',
      type: 'allow',
      source: 'test',
      addedAt: new Date().toISOString(),
    });

    const isAllowed1 = await domainRulesService.isOnAllowlist('subdomain.wildcard.com');
    expect(isAllowed1).toBe(true);

    const isAllowed2 = await domainRulesService.isOnAllowlist('wildcard.com');
    expect(isAllowed2).toBe(true);

    const isAllowed3 = await domainRulesService.isOnAllowlist('other.com');
    expect(isAllowed3).toBe(false);
  });
});

