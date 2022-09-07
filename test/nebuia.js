const AlumniOfVC = artifacts.require("AlumniOfVC");
const NebuVC = artifacts.require('NebuVC');
const { ethers } = require("ethers");

const domain = {
  name: 'AlumniOf Verifiable Credential',
  version: '1',
  chainId: 1,
  verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
};

const types = {
  University: [
    { name: 'value', type: 'string' },
    { name: 'subjects', type: 'string[]' },
  ],
  AlumniOf: [
    { name: 'id', type: 'string' },
    { name: 'universities', type: 'University[]' },
  ]
};

//truffle test --show-events

contract('AlumniOf', (accounts) => {
  it('Test AlumniOf signature', async () => {
    const _credential = await AlumniOfVC.deployed();
    const _vc = await NebuVC.deployed();
    const signer = new ethers.Wallet('f4951e7e4a65b7c39576eaf474097bc376b5e3c825856dfd26bb9ec6307bc2db'); // deployer

    // sha512 checksum from ip files
    const subjects = [
      'spanish',
      'english'
    ];

    const value = {
      id: 'id_sample',
      universities: [
        {
          value: 'UAEM',
          subjects: subjects,
        }
      ],
    };

    // serialized value
    const bytesEIP = '0x0969645f73616d706c650100000000000000000000000000000000000000000000000000000000000000045541454d0200000000000000000000000000000000000000000000000000000000000000077370616e69736807656e676c697368';


    const signature = await signer._signTypedData(domain, types, value);

    const encode = await _credential.serializeAlumniOf(value);
    const decode = await _credential.deserializeAlumniOf(encode);

    //assert.equal(decode.universities, value.universities, "invalid encode/decode");
    // (v, r, s) = digest = signature

    let owner = await _credential.recoverSigner(
      value,
      signature);

    assert.equal(owner, signer.address, "invalid signature");

    const tx = await _vc.createVC(
      _credential.address,
      signer.address,
      bytesEIP,
      signature,
      1662503835, // expiration
    );

    console.log('Gas create VC: ', tx.receipt.gasUsed);

    const credentials = await _vc.getVCFromUser();
    //console.log(credentials);

    assert.equal(credentials.length, 1, "credential not saved");

    let valid = await _vc.verifyVC(
      signer.address,
      0,
      signature,
    );

    assert.equal(valid, true, "invalid credential");

    const revoke = await _vc.revokeVC(
      signer.address,
      0,
    );

    console.log('Gas revoke: ', revoke.receipt.gasUsed);

    valid = await _vc.verifyVC(
      signer.address,
      0,
      signature,
    );

    assert.equal(valid, false, "invalid credential");

    const domainVC = await _vc.domain(_credential.address);

    assert.equal(domainVC.name, domain.name, "invalid domain name");
    assert.equal(domainVC.version, domain.version, "invalid domain version");
    assert.equal(domainVC.chainId, domain.chainId, "invalid domain chainId");


    const onwerVC = await _vc.owner(_credential.address);
    assert.equal(onwerVC, signer.address, "invalid domain name");
  });
});