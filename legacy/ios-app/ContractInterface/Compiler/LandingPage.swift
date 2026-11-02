//
//  LandingPage.swift
//  ContractInterface
//
//  Created by Quincy Jones on 1/24/23.
//

import SwiftUI

struct LandingPage: View {
    @StateObject var ciml:ContractModel
    @Binding var showDapplet:Bool
    @State var downloadable:Bool = false

    var body: some View {
        ZStack{
            ZStack{
                VStack {
                    if let url = URL(string: ciml.thumbnail) {
                        RemoteImageView(url: url)
                            .cornerRadius(20)
                            .scaledToFit()
                            .padding(.top)
                    } else {
                        Text("Invalid URL")
                            .task{
                                print("CIML Thumbnail: \( ciml.thumbnail)")
                            }
                    }
                    
                    VStack {
                        ListObject(ciml: ciml)
                        HStack(){
                            ScrollView(.horizontal){
                                HStack{
                                    ForEach(ciml.metadata, id: \.self){ meta in
                                        Text(meta)
                                            .padding(5)
                                            .font(.caption)
                                            .background(Color.blue)
                                            .foregroundColor(.white)
                                            .cornerRadius(20)
                                            .task{
                                                if(meta == "downloadable"){
                                                    downloadable = true
                                                }
                                            }
                                    }
                                }.padding(.horizontal)
                            }
                    }
                        Toggle("Downloadable", isOn: $downloadable).padding()
                    }
                    HStack(alignment: .center){
                        Button(action: {
                            showDapplet = true
                        }, label: {
                            Text("Open")
                                .foregroundColor(.black)
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(Color.green)
                                .cornerRadius(20)
                        })
                    }.padding()
                }
            }
            .shadow(radius: 5)
            .background(Color.white)
            .cornerRadius(20)
            .frame(maxWidth: .infinity)
            .padding(.horizontal)
            .padding(.vertical)
            
        }.background(Color.black)
    }

}

struct ListObject: View{
    @StateObject var ciml:ContractModel
    var body: some View {
        HStack(alignment: .top){
            if let url = URL(string: ciml.logo) {
                RemoteImageView(url: url)
                    .cornerRadius(5)
                    .frame(width: 60, height: 60)
                    .scaledToFit()
                    .padding(.top)
            } else {
                Text("Invalid URL")
                    .task{
                        print("CIML Logo: \( ciml.logo)")
                    }
            }
    
            ScrollView(.vertical){
                VStack(alignment: .leading){
                    Text(ciml.name)
                        .font(.largeTitle)
                        .bold()
                    Text(ciml.description)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
        }
    }
}

struct RemoteImageView: View {
    @State private var image: UIImage?
    
    let url: URL
    
    var body: some View {
        VStack {
            if image != nil {
                Image(uiImage: image!)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } else {
                Text("Loading...")
            }
        }.onAppear(perform: loadImage)
    }
    
    private func loadImage() {
        URLSession.shared.dataTask(with: url) { (data, response, error) in
            if let data = data {
                DispatchQueue.main.async {
                    if let image = UIImage(data: data) {
                        self.image = image
                    } else {
                        // handle failure to create UIImage from data
                        print("error to create UIImage")
                    }
                }
            } else {
                // handle nil data
                print("error for UIImage nil")
            }
        }.resume()
    }
}
