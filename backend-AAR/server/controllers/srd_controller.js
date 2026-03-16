const srdService = require("../services/srd_service");

exports.searchsrd = (req,res) => {
    res.render("search_srd", {results: null, nation: null});
};

exports.getsrdByNation = async (req, res) => {
  try {
    const nation = req.query.nation;

    const srd = await srdService.getsrdByNation(nation);

    res.render("search_srd", { 
      results: srd,
      nation: nation
    });

  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.deletesrd = async (req, res) => {
    try {
        const id = req.params.id;
        await srdService.deletesrd(id);

        // Redirect back to the same page after deletion
        res.redirect("/srd");
    } catch (error) {
        res.status(500).send(error.message);
    }
};

