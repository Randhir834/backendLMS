const { getAllSettings, getSettingByKey, upsertSetting } = require('../services/settingsService');

const getSettings = async (req, res, next) => {
  try {
    const settings = await getAllSettings();
    res.json({ settings });
  } catch (error) { next(error); }
};

const getSetting = async (req, res, next) => {
  try {
    const setting = await getSettingByKey(req.params.key);
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
    res.json({ setting });
  } catch (error) { next(error); }
};

const updateSetting = async (req, res, next) => {
  try {
    const setting = await upsertSetting(req.params.key, req.body.value);
    res.json({ message: 'Setting updated', setting });
  } catch (error) { next(error); }
};

module.exports = { getSettings, getSetting, updateSetting };
