# Testing Environment Configuration

## Production Safety

The test suite now uses separate environment variables to prevent accidental use of production Stripe keys.

### Environment Variables Required for Testing

**Test Environment:**
- `STRIPE_TEST_SECRET_KEY` - Your Stripe test secret key (sk_test_...)
- `STRIPE_TEST_PUBLIC_KEY` - Your Stripe test publishable key (pk_test_...)
- `STRIPE_TEST_WEBHOOK_SECRET` - Your Stripe test webhook secret (whsec_...)

**Production Environment:**
- `STRIPE_SECRET_KEY` - Your Stripe live secret key (sk_live_...)
- `VITE_STRIPE_PUBLIC_KEY` - Your Stripe live publishable key (pk_live_...)
- `STRIPE_WEBHOOK_SECRET` - Your Stripe live webhook secret

### Safety Features

1. **Production Key Detection**: Tests automatically abort if production keys (sk_live_*) are detected
2. **Separate Test Variables**: Tests only use STRIPE_TEST_* environment variables
3. **Environment Isolation**: Test cleanup removes test variables after completion

### Running Tests Safely

**Local Development:**
```bash
# Set test keys in your .env.test file
STRIPE_TEST_SECRET_KEY=sk_test_your_test_key_here
STRIPE_TEST_PUBLIC_KEY=pk_test_your_test_key_here
STRIPE_TEST_WEBHOOK_SECRET=whsec_your_test_webhook_secret

# Run tests
npm test
```

**Production Server:**
Tests should never run on production servers. If they must run for debugging:
1. Ensure only STRIPE_TEST_* variables are set
2. Never set production keys in test environment
3. Tests will fail safely if production keys are detected

### Key Types

- **Test Keys**: Always start with `sk_test_` or `pk_test_`
- **Live Keys**: Always start with `sk_live_` or `pk_live_`
- **Test Mode**: Safe for testing, no real charges
- **Live Mode**: Real payments, production environment only