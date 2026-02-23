// Preset classroom challenges themed around classic video game icons.
window.BINARY_MOSAIC_PRESETS = (() => {
  function fromRows(rows) {
    const size = rows.length;
    return {
      size,
      cells: rows.flatMap((row) => row.split('').map((ch) => Number(ch)))
    };
  }

  const easyMarioMushroom = fromRows([
    '00011000',
    '00111100',
    '01111110',
    '01111110',
    '01111110',
    '00111100',
    '00111100',
    '00011000'
  ]);

  const easyHeartContainer = fromRows([
    '00100100',
    '01111110',
    '11111111',
    '11111111',
    '01111110',
    '00111100',
    '00011000',
    '00000000'
  ]);

  const easyCoin = fromRows([
    '00011000',
    '00111100',
    '01111110',
    '01111110',
    '01111110',
    '01111110',
    '00111100',
    '00011000'
  ]);

  const easyTriforce = fromRows([
    '00011000',
    '00111100',
    '01111110',
    '00000000',
    '00100100',
    '01111110',
    '11111111',
    '00000000'
  ]);

  const mediumMarioFace = fromRows([
    '000000111000',
    '000011111110',
    '000111221110',
    '001112222111',
    '011122222211',
    '011123333211',
    '011233332211',
    '011222222211',
    '001122222110',
    '000112221100',
    '000011111000',
    '000001110000'
  ]);

  const mediumMinecraftCreeper = fromRows([
    '111111111111',
    '122222222221',
    '122011110221',
    '122011110221',
    '122222222221',
    '122202202221',
    '122202202221',
    '122200002221',
    '122200002221',
    '122202202221',
    '122222222221',
    '111111111111'
  ]);

  const hardLinkShield = fromRows([
    '0000000111100000',
    '0000011222210000',
    '0001122222221000',
    '0011222333221100',
    '0112223333322210',
    '1122233333332221',
    '1222331111332221',
    '1222331111332221',
    '1222233333332221',
    '1122223333322221',
    '0112222333222210',
    '0011222222221100',
    '0001122222221000',
    '0000112222210000',
    '0000011111100000',
    '0000000111000000'
  ]);

  const hardSpaceInvader = fromRows([
    '0000110000110000',
    '0001111001111000',
    '0011111111111100',
    '0110111111110110',
    '1111111111111111',
    '1101111111111011',
    '1101100000011011',
    '0000110110110000',
    '0001110110111000',
    '0011001001001100',
    '0110011001100110',
    '1100000000000011',
    '1000110000110001',
    '0001100000011000',
    '0011000000001100',
    '0000000000000000'
  ]);

  return [
    { title: 'Easy: Mario Mushroom', bitDepth: 1, ...easyMarioMushroom },
    { title: 'Easy: Zelda Heart', bitDepth: 1, ...easyHeartContainer },
    { title: 'Easy: Gold Coin', bitDepth: 1, ...easyCoin },
    { title: 'Easy: Triforce', bitDepth: 1, ...easyTriforce },
    { title: 'Medium: Mario Portrait', bitDepth: 2, ...mediumMarioFace },
    { title: 'Medium: Minecraft Creeper', bitDepth: 2, ...mediumMinecraftCreeper },
    { title: 'Hard: Link Shield', bitDepth: 2, ...hardLinkShield },
    { title: 'Hard: Space Invader', bitDepth: 2, ...hardSpaceInvader }
  ];
})();
