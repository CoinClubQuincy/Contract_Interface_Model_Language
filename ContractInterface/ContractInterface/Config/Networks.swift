//
//  Networks.swift
//  ContractInterface
//
//  Created by Quincy Jones on 7/8/23.
//

import Foundation

struct NetworkInfo: Codable {
    let name: String
    let symbol: String
    let rpcPrimary: String
    let rpcFailover: String
    let rpcTestnet: String
    let priceFeed: String
}

enum NetworkRPC {
    case primary
    case failover
    case testnet
}

/// Parses the network information JSON data and retrieves the RPC endpoints for the specified symbol and network type.
/// - Parameters:
///   - symbol: The symbol of the network.
///   - network: The type of network RPC endpoint to retrieve.
/// - Returns: A tuple of strings representing the RPC endpoints, or nil if the network information is not found.
func parseNetworkInfo(symbol: String, network: NetworkRPC) -> (String, String, String, String)? {
    guard let jsonData = networkRPCs.data(using: .utf8) else {
        fatalError("Failed to convert JSON string to data.")
    }
    let decoder = JSONDecoder()
    do {
        let networkInfoArray = try decoder.decode([NetworkInfo].self, from: jsonData)
        
        for networkInfo in networkInfoArray {
            if networkInfo.symbol == symbol {
                switch network {
                case .primary:
                    return (networkInfo.name, networkInfo.symbol, networkInfo.rpcPrimary, networkInfo.priceFeed)
                case .failover:
                    return (networkInfo.name, networkInfo.symbol, networkInfo.rpcFailover, networkInfo.priceFeed)
                case .testnet:
                    return (networkInfo.name, networkInfo.symbol, networkInfo.rpcTestnet, networkInfo.priceFeed)
                }
            }
        }
    } catch {
        print("Error parsing JSON: \(error)")
    }
    return nil
}

// JSON data containing the network information
let networkRPCs = """
    [
      {
        "name": "XDC Network",
        "symbol": "XDC",
        "rpcPrimary": "https://rpc.XDC.org",
        "rpcFailover": "https://rpc.xinfin.network",
        "rpcTestnet": "https://rpc.apothem.network",
        "priceFeed": "https://api.coingecko.com/api/v3/simple/price?ids=xdce-crowd-sale&vs_currencies=usd"
      },
      {
        "name": "ETH",
        "symbol": "ETH",
        "rpcPrimary": "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID",
        "rpcFailover": "https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_API_KEY",
        "rpcTestnet": "https://ropsten.infura.io/v3/YOUR_INFURA_PROJECT_ID",
        "priceFeed": "https://api.coingecko.com/api/v3/simple/price?ids=xdce-crowd-sale&vs_currencies=usd"
      },
      {
        "name": "Binance Smart Chain Mainnet",
        "symbol": "",
        "rpcPrimary": "https://bsc-dataseed.binance.org",
        "rpcFailover": "https://bsc-dataseed1.defibit.io",
        "rpcTestnet": "https://data-seed-prebsc-1-s1.binance.org:8545",
        "priceFeed": "https://api.coingecko.com/api/v3/simple/price?ids=xdce-crowd-sale&vs_currencies=usd"
      },
      {
        "name": "Polygon Mainnet",
        "symbol": "MATIC",
        "rpcPrimary": "https://rpc-mainnet.maticvigil.com",
        "rpcFailover": "https://polygon-rpc.com",
        "rpcTestnet": "https://rpc-mumbai.matic.today",
        "priceFeed": "https://api.coingecko.com/api/v3/simple/price?ids=xdce-crowd-sale&vs_currencies=usd"
      },
      {
        "name": "Ethereum Classic Mainnet",
        "symbol": "ETC",
        "rpcPrimary": "https://ethereumclassic.network",
        "rpcFailover": "https://ethereumclassic.network",
        "rpcTestnet": "https://kotti.ethereumclassic.network",
        "priceFeed": "https://api.coingecko.com/api/v3/simple/price?ids=xdce-crowd-sale&vs_currencies=usd"
      },
      {
        "name": "Ganache",
        "symbol": "Ganache",
        "rpcPrimary": "HTTP://127.0.0.1:8545",
        "rpcFailover": "HTTP://127.0.0.1:8546",
        "rpcTestnet": "HTTP://127.0.0.1:8547",
        "priceFeed": "https://api.coingecko.com/api/v3/simple/price?ids=xdce-crowd-sale&vs_currencies=usd"
      }
    ]
"""
