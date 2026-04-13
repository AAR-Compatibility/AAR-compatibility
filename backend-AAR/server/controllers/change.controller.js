// This controller exposes the SRD holder change request workflow over JSON endpoints
// so requests can be submitted, reviewed, rejected, approved, and processed from the UI.
const ChangeService = require('../services/change.service');

function getAuthenticatedUserId(req) {
  return Number(req.user?.sub ?? req.user?.id ?? 0);
}

const ChangeController = {
  async listMine(req, res, next) {
    try {
      const rows = await ChangeService.listOwnRequests(getAuthenticatedUserId(req));
      return res.json({ ok: true, rows });
    } catch (error) {
      return next(error);
    }
  },

  async listAll(req, res, next) {
    try {
      const rows = await ChangeService.listAllRequests();
      return res.json({ ok: true, rows });
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      const request = await ChangeService.createRequest(req.body, getAuthenticatedUserId(req));
      return res.status(201).json({ ok: true, request });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return next(error);
    }
  },

  async updateRejected(req, res, next) {
    try {
      const request = await ChangeService.updateRejectedRequest(
        Number(req.params.id),
        req.body,
        getAuthenticatedUserId(req),
      );
      return res.json({ ok: true, request });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return next(error);
    }
  },

  async deleteOwn(req, res, next) {
    try {
      await ChangeService.deleteOwnRequest(Number(req.params.id), getAuthenticatedUserId(req));
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return next(error);
    }
  },

  async deleteForAdmin(req, res, next) {
    try {
      await ChangeService.deleteRequestForAdmin(Number(req.params.id));
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return next(error);
    }
  },

  async approve(req, res, next) {
    try {
      const request = await ChangeService.approveRequest(
        Number(req.params.id),
        getAuthenticatedUserId(req),
      );
      return res.json({ ok: true, request });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return next(error);
    }
  },

  async reject(req, res, next) {
    try {
      const request = await ChangeService.rejectRequest(
        Number(req.params.id),
        req.body?.reviewComment,
        getAuthenticatedUserId(req),
      );
      return res.json({ ok: true, request });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return next(error);
    }
  },

  async process(req, res, next) {
    try {
      const request = await ChangeService.processApprovedRequest(Number(req.params.id));
      return res.json({ ok: true, request });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return next(error);
    }
  },
};

module.exports = ChangeController;
