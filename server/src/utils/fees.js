const PLATFORM_FEE_RATE = 0.10;

function calculatePlatformFee(entryFee) {
  const platform_fee = Math.round(entryFee * PLATFORM_FEE_RATE * 100) / 100;
  const host_amount = Math.round((entryFee - platform_fee) * 100) / 100;
  return { platform_fee, host_amount };
}

module.exports = { calculatePlatformFee, PLATFORM_FEE_RATE };
