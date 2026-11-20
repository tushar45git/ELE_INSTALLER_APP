/**
 * Adds the Punjab districts / assemblies used by the app to the polling DB
 * `district` collection (the list the District and Assembly dropdowns show).
 *
 * districtAssemblyCode = "<district number>.<assembly code>", the same format
 * the portal uses (e.g. "1.247"). Rows are upserted by districtAssemblyCode,
 * so running the script again does not create duplicates.
 *
 * Usage (from Election-Seperate-Backend):  node scripts/seedPunjabDistricts.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../config/config.env") });
const { getPollingModels } = require("../models/polling");
const { getPollingConnection } = require("../config/pollingDatabase");

// District number used in districtAssemblyCode (1-10 are already used by the portal).
const DISTRICTS = [
  {
    no: 11,
    name: "MOHALI",
    assemblies: [
      [52, "Kharar"],
      [53, "SAS Nagar"],
      [112, "Dera Bassi"],
    ],
  },
  {
    no: 12,
    name: "JALANDHAR",
    assemblies: [
      [34, "Jalandhar West"],
      [35, "Jalandhar Central"],
      [36, "Jalandhar North"],
    ],
  },
  {
    no: 13,
    name: "LUDHIANA",
    assemblies: [
      [60, "Ludhiana East"],
      [61, "Ludhiana South"],
      [64, "Ludhiana West"],
    ],
  },
];

(async () => {
  const { District } = getPollingModels();
  const last = await District.findOne({}, { Srno: 1 }).sort({ Srno: -1 }).lean();
  let srno = Number(last?.Srno) || 0;

  for (const d of DISTRICTS) {
    for (const [code, name] of d.assemblies) {
      const districtAssemblyCode = `${d.no}.${code}`;
      const exists = await District.exists({ districtAssemblyCode });
      if (exists) {
        console.log(`exists   ${districtAssemblyCode}  ${d.name} / ${code}-${name}`);
        continue;
      }
      await District.create({
        Srno: ++srno,
        dist_name: d.name,
        accode: String(code),
        accName: `${code}-${name}`,
        districtAssemblyCode,
      });
      console.log(`inserted ${districtAssemblyCode}  ${d.name} / ${code}-${name}`);
    }
  }

  await getPollingConnection().close();
})().catch(async (e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
