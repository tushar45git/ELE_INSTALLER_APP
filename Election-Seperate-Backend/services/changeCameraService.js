/**
 * ChangeCamera ledger orchestration.
 *
 * Encapsulates the SP's two independent edit-time mutations so the fragile
 * double-match in the original (a location rewrite could re-touch the row the
 * camera-change block had just closed) cannot happen: the two effects are
 * expressed as explicit, ordered, guarded steps.
 */

const changeCameraRepository = require("../repositories/changeCameraRepository");

const tupleFrom = (o) => ({
  district: o.district,
  accode: o.accode,
  acname: o.acname,
  psNo: o.psNum,
  location: o.location,
});

/** ADD: open a brand-new active ledger row for the mapping. */
async function onCreate(makeRequest, mapping, streamName, getist) {
  await changeCameraRepository.openRow(
    makeRequest,
    tupleFrom(mapping),
    streamName,
    getist,
  );
}

/**
 * EDIT: reproduce the SP's conditional ledger behaviour.
 * @param old  { streamId, streamName, district, accode, acname, psNum, location }
 * @param next { streamId, streamName, district, accode, acname, psNum, location }
 */
async function onEdit(makeRequest, old, next, getist) {
  const cameraChanged = old.streamId !== next.streamId;
  const locationChanged =
    old.district !== next.district ||
    old.acname !== next.acname ||
    old.location !== next.location ||
    old.psNum !== next.psNum ||
    old.accode !== next.accode;

  // 1) Camera changed: close the old camera's active row, open one for the new.
  if (cameraChanged) {
    await changeCameraRepository.closeActiveRow(
      makeRequest,
      tupleFrom(old),
      old.streamName,
      getist,
    );
    await changeCameraRepository.openRow(
      makeRequest,
      tupleFrom(next),
      next.streamName,
      getist,
    );
  }

  // 2) Location metadata changed: rewrite the ledger row in place. When the
  //    camera ALSO changed we already opened a fresh row above with the new
  //    metadata, so the old-tuple lookup only ever matches historical rows —
  //    the double-touch bug from the SP is structurally avoided.
  if (locationChanged) {
    const rowId = await changeCameraRepository.findLocationRowId(
      makeRequest,
      tupleFrom(old),
    );
    if (rowId) {
      await changeCameraRepository.rewriteLocation(
        makeRequest,
        rowId,
        tupleFrom(next),
      );
    }
  }
}

/** DELETE: close the mapping's active ledger row. */
async function onDelete(makeRequest, mapping, streamName, getist) {
  await changeCameraRepository.closeActiveRow(
    makeRequest,
    tupleFrom(mapping),
    streamName,
    getist,
  );
}

module.exports = { onCreate, onEdit, onDelete };
