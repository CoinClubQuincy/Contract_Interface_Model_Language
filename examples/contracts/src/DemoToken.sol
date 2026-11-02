// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// A small ERC-20 for tests and the playground. Anyone can mint, so it has no value.
contract DemoToken {
    string public name = "Demo Token";
    string public symbol = "DEMO";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    uint256 public deposits;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error InsufficientBalance(uint256 available, uint256 needed);

    function mint(address to, uint256 value) external {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        uint256 available = balanceOf[msg.sender];
        if (available < value) revert InsufficientBalance(available, value);
        balanceOf[msg.sender] = available - value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function deposit() external payable {
        deposits += msg.value;
    }

    function holdings(address account) external view returns (uint256 balance, uint256 total) {
        return (balanceOf[account], totalSupply);
    }
}
