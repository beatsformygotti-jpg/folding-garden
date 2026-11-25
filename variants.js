'use strict';

// Rule boards are keyed by their stable campaign IDs. The back is aligned to the front through the paper.
const GardenVariants = {
  6: {
    rows: ['ttddpp'],
    order: 'tdp'
  },
  7: {
    rows: ['iippppddtt'],
    order: 'ipdt'
  },
  8: {
    rows: ['iittippidd'],
    stems: ['3122013031']
  },
  15: {
    rows: ['ttpppii', 'ttpppii'],
    order: 'tip'
  },
  17: {
    rows: ['ppppdd'],
    stems: ['002200']
  },
  21: {
    rows: ['iippiiii', 'iippddpp', 'ddddpddd', 'ddddpdpp'],
    stems: ['11103100', '11121331', '21333131', '01333131']
  },
  22: {
    rows: ['iiiiii', 'iiiiii', 'ddddtt', 'pppptt', 'pppptt'],
    order: 'itpd'
  },
  24: {
    rows: ['t.pttddd', 't.pttddd', 'ippttptt', 'ipd..d..']
  },
  26: {
    rows: ['piipiipppp', 'ippiiipptt', '.pttt.iitt', '.pttt.iidd']
  },
  27: {
    rows: ['ppiiiiiii', 'ppiiiiiii', 'ppdddtttt', 'ppdddtttt'],
    stems: ['223222000', '003000222', '002032312', '130233001'],
    order: 'pitd'
  },
  28: {
    rows: ['ppddipii', 'ppttipdd', '..d.tiii', 'ttd.tiii']
  },
  29: {
    rows: ['tptpdd', 'tptpdd', 'ppttii', 'pdiitt', 'pdiiii'],
    stems: ['232313', '030300', '131322', '323100', '300031']
  },
  31: {
    rows: ['.dddiitttt', '.ddd..tttt', 'ppppii..tt'],
    order: 'tidp'
  },
  32: {
    rows: ['ididiitp', 'ptpidipd', 'ttiddppi', 'itddpddi'],
    back: ['tttttidd', 'iiiitiii', 'ddiiiddd', 'ppiiiddd']
  },
  33: {
    rows: ['idptii', 'idptii', 'iiii..', 'ttppii', 'dipptt', 'dipp..']
  },
  34: {
    rows: ['ttttitpdi', 'iippiptip', 'ttdpttpdi', 'ttpitptpi'],
    back: ['tipdiidii', 'tipiddiii', 'ipiidddpt', 'ppiidddpt']
  },
  35: {
    rows: ['iiiiiiiiii', 'iiiiiiiiii', 'iippppddtt', 'iippppddtt'],
    stems: ['1303223103', '0023003123', '0030333131', '0032332222'],
    order: 'itdp'
  },
  36: {
    rows: ['tttdtiittt', 'tttdiiiiii', 'tdiidiiddd', 'pidditdddd', 'tdipdttpdd'],
    back: ['diipidiidi', 'pdtiptdtdt', 'iddipippdd', 'tpittdpidi', 'tpittdpipt']
  },
  37: {
    rows: ['ttipiitt', 'ddipii..', 'ddppiipp', 'ttddidpp', 'tt..idtt'],
    stems: ['31001200', '222210..', '22223113', '00002022', '22..0213']
  },
  39: {
    rows: ['iiddpppdii', 'ppttttpddd', 'ppttttiiii'],
    stems: ['1331221031', '2200311222', '3131131322']
  },
  40: {
    rows: ['dtip..dd', 'dtiptidd', '..ppptii', 'ppttdtdd', 'ttpddipp', 'pptp..tt'],
    back: ['dpdd..ti', 'iptiiidi', '..dtdddp', 'ppdtiipp', 'ptptddti', 'ippt..ip']
  },
  41: {
    rows: ['iittiiidii', 'iiddddidtt', 'ppptdidpdp', 'iiptdidpdp'],
    stems: ['1322311122', '0000221131', '1331132233', '0031130033']
  },
  42: {
    rows: ['iiddddddii', 'iiddddddii', 'iippttttii', 'ii..pp.pii', '..pppp.p..'],
    order: 'idpt'
  },
  43: {
    rows: ['ddtidiiti', 'ddpiiipip', 'ddpittddt', 'ddddttppt', 'ddpipiiii', 'ddpiptddt'],
    back: ['dtpidtddd', 'ttpidtddd', 'iittppipt', 'tdttddddd', 'tipdpdidt', 'idtdpidid']
  },
  44: {
    rows: ['ttdtddiiii', '..ttpiiiii', 'ttttitiiii', 'ddittt..dd', '..pdpt....', 'ddddddii..'],
    back: ['tdtttdidip', '..iitddpdd', 'tpddtttdpt', 'ptttdd..td', '..iidd....', 'iiiiiiip..']
  },
  45: {
    rows: ['.ipittdtii', '.itittpdii', 'dippippiii', 'pdiidt....', 'ttiiddpidd'],
    back: ['.dttiiitpi', '.dttiiitpp', 'iiptddiiip', 'dditdd....', 'iiiipittit']
  },
  46: {
    rows: ['ttdd.ddtt', '..dd.dd..', 'ttddppitt', 'ttddppitt', 'ttddppptt', 'ttddppptt'],
    stems: ['2200.1122', '..22.11..', '002213031', '133113200', '220000031', '001322222'],
    order: 'tdpi'
  },
  47: {
    rows: ['ppppiiddtd', 'ppttttpiti', 'iippddippp', 'ddiippipii', 'ppipppiddi', 'ddtptddiip'],
    back: ['diitdtiidp', 'idtipiiidp', 'pddpptitdt', 'tipppddiid', 'tidttpdiip', 'ipdttpdiip']
  },
  48: {
    rows: ['ttttitiidddd', 'ppttitiipptt', 'iiiiddpppptt'],
    stems: ['223102002231', '310020311322', '002213222200']
  },
  49: {
    rows: ['dd...iii..tt', 'dddd.iiitttt', '..ddppiitttt', 'ddddpp..tttt', 'ddddppiitttt'],
    stems: ['22...031..13', '1322.2310000', '..1331312222', '223101..0013', '220021130031'],
    order: 'dtip'
  },
  50: {
    rows: ['tttp..tddtdd', '..ttidtddttt', 'tttddtiidppp', 'ppiit.ddpitt', 'ppdpt.ddpiii'],
    back: ['itdd..iitipt', '..iippdipttd', 'idttiiitiipi', 'itddi.dpditt', 'ipppp.pditpt']
  },
};

if (typeof module !== 'undefined') module.exports = GardenVariants;
