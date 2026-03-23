const srdService = require("../services/srd_service");


exports.searchsrd = (req, res) => {
  res.json({ message: "SRD search endpoint" });
};


exports.getsrdByNation = async (req, res) => {
  console.log("HIT /srd/search", req.query);
  try {
    const { nation } = req.query;

    if (!nation) {
      return res.status(400).json({ error: "Nation is required" });
    }

    const data = await srdService.getsrdByNation(nation);

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.deletesrd = async (req, res) => {
  try {
    const id = req.params.id;
    await srdService.deleteById(id);

    // API should NOT redirect in most cases
    res.json({ ok: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  searchsrd: exports.searchsrd,
  getsrdByNation: exports.getsrdByNation,
  deletesrd: exports.deletesrd,
};