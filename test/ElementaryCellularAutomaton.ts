import { expect } from "chai";
import { ethers } from "hardhat";

describe("ElementaryCellularAutomaton", function () {

    it("deploy", async function () {
        const contract = await ethers.deployContract("ElementaryCellularAutomaton");

        await contract.next(30, 30);

        const show = async () => console.log(await contract.print());
        await show()

        await contract.next(30, 10);
        await show()
        console.log("done")

    });


    it.only("Check bitmap is as expected", async function () {
        const a = await ethers.deployContract("ElementaryCellularAutomaton");

        // check that the bitmap is as expected at a specific index
        const expectBitmapAtNToBe = async (n: number, expected: number) => {
            const wordIndex = Math.floor(n / 256)
            const bitIndex : bigint = BigInt (n % 256)
            const word = await a['bitmap'](wordIndex)
            const bit = (word >> bitIndex) & BigInt(1)

            expect(bit).to.equal(BigInt(expected))
        }
        await expectBitmapAtNToBe(0, 1)

        // check that the index provided is out of bounds
        const expectIndexToBeOutOfBounds = async (n: number) => expect(a['bitmap'](n)).to.be.revertedWithoutReason()
        await expectIndexToBeOutOfBounds(1)

        // apply rule 30 1 time
        await a.next(30, 1)
        await expectBitmapAtNToBe(0, 1)
        // await expectBitmapAtNToBe(1, 1)
        // await expectBitmapAtNToBe(2, 1)
        // await expectIndexToBeOutOfBounds(3)


    });

})
