// ['seconds', 'minutes', 'hours', 'dayOfMonth', 'month', 'dayOfWeek']
let freqMinutes =  process.env.WEBHOOK_FREQ_MINUTES ? process.WEBHOOK_FREQ_MINUTES : '2';
const notificationsEnabled = process.env.WEBHOOK_NOTIFICATIONS_ENABLED === 'true';

module.exports.cron = {
  dispatchWebhooks: {
    schedule: `0 */${freqMinutes} * * * *`,
    onTick: async () =>  {
      try {
        await NotificationService.dispatchPendingWebhooks();
      } catch(err) {
        sails.log.error(err);
      }
    },
    start:notificationsEnabled
  }
};
