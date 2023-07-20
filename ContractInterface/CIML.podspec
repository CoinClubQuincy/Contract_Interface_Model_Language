Pod::Spec.new do |spec|
  spec.name         = "CIML"
  spec.version      = "0.1.0"
  spec.summary      = "CIML - is built to allow Smart contract Developers to be able to launch dynamic UI's for their smart contracts"
  spec.description  = "CIML - is built to allow Smart contract Developers to be able to launch dynamic UI's for their smart contracts on multiple devices with minimal effort and with a powerful result. CIML Aims to be the Standard for Smart Contract UI code Development for Mobile application development"
  spec.homepage     = "https://github.com/CoinClubQuincy/CIML"
  spec.license      = "MIT"
  spec.author       = { "Quincy Jones" => "rqjones@asu.edu" }
  spec.platform     = :ios, "16.0"
  spec.source       = { :git => "https://github.com/CoinClubQuincy/CIML.git", :tag => "#{spec.version}" }
  spec.source_files = 'ContractInterface/**/*.swift', 'Pods/BigInt/Sources/Addition.swift'
  spec.framework    = "CIML"
  spec.frameworks   = "CIML", "web3swift", "XDC3Swift"
  spec.requires_arc = true
  spec.swift_versions = "5.0"
end
