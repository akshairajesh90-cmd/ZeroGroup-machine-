import { parseKeralaLocation, BROAD_KERALA_LOCAL_BODIES } from "../keralaGeoParser";

describe("Kerala Rural Locality & LSGD Geo Parser", () => {
  it("correctly classifies Pala and Erattupetta as Municipalities", () => {
    expect(BROAD_KERALA_LOCAL_BODIES.pala.type).toBe("MUNICIPALITY");
    expect(BROAD_KERALA_LOCAL_BODIES.erattupetta.type).toBe("MUNICIPALITY");
    expect(BROAD_KERALA_LOCAL_BODIES.poonjar.type).toBe("GRAMA_PANCHAYAT");
  });

  it("does not list Mankombu under Teekoy", () => {
    expect(BROAD_KERALA_LOCAL_BODIES.teekoy.sampleWards).not.toContain("Mankombu");
    expect(BROAD_KERALA_LOCAL_BODIES.teekoy.sampleWards).toContain("Vellikulam");
  });

  it("warns when user inputs only broad municipality or panchayat name without anchor", () => {
    const res = parseKeralaLocation("Erattupetta");
    expect(res.isAmbiguous).toBe(true);
    expect(res.warningMessage).toContain("Erattupetta");
    expect(res.warningMessage).toContain("Municipality");
  });

  it("parses structured rural addresses with sub-locality and structural anchor", () => {
    const res = parseKeralaLocation("Panackapalam, near St. Antony Church, Poonjar");
    expect(res.isAmbiguous).toBe(false);
    expect(res.broadTown).toBe("Poonjar");
    expect(res.subLocality).toBe("Panackapalam");
    expect(res.structuralAnchor).toBeDefined();
  });
});
