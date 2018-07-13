/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global getAssetRegistry getFactory emit query */



/**
 * Make an Offer for a commodity listing
 * @param {org.example.trading.Offer} offer - the offer
 * @transaction
 */
async function makeOffer(offer) {  // eslint-disable-line no-unused-vars
    let listing = offer.listing;
    if (listing.state !== 'FOR_SALE') {
        throw new Error('Listing is not FOR SALE');
    }
    if (!listing.offers) {
        listing.offers = [];
    }
    listing.offers.push(offer);

    // save the commodity listing
    const commodityListingRegistry = await getAssetRegistry('org.example.trading.CommodityListing');
    await commodityListingRegistry.update(listing);
}



/**
 * Close the bidding for a commodity listing and choose the
 * highest bid that is over the asking price
 * @param {org.example.trading.CloseBidding} closeBidding - the closeBidding transaction
 * @transaction
 */
async function closeBidding(closeBidding) {  // eslint-disable-line no-unused-vars
     const listing = closeBidding.listing;
    if (listing.state !== 'FOR_SALE') {
        throw new Error('Listing is not FOR SALE');
    }
    // by default we mark the listing as RESERVE_NOT_MET
    listing.state = 'RESERVE_NOT_MET';
    let highestOffer = null;
    let buyer = null;
    let seller = null;
    if (listing.offers && listing.offers.length > 0) {
        // sort the bids by bidPrice
        listing.offers.sort(function(a, b) {
            return (b.bidPrice - a.bidPrice);
        });
        highestOffer = listing.offers[0];
        if (highestOffer.bidPrice >= listing.reservePrice) {
            // mark the listing as SOLD
            listing.state = 'SOLD';
            buyer = highestOffer.member;
            seller = listing.commodity.owner;
            // update the balance of the seller and buyer
            
            console.log('#### buyer qr1 before: ' + buyer.qr1 +'#### buyer tc1 before: ' + buyer.tc1);
            buyer.qr1 -= seller.q1;
            buyer.tc1 += seller.q1;
            console.log('#### buyer qr1 after: ' + buyer.qr1 + '#### buyer tc1 after: ' + buyer.tc1);
           
            console.log('#### seller q1 before: ' + seller.q1);
            seller.q1 = 0;
            console.log('#### seller q1 after: ' + seller.q1);
            
            // transfer the commodity to the buyer
            listing.commodity.owner = buyer;
            // clear the offers
            listing.offers = null;
        
            
        }
    }

    if (highestOffer) {
        // save the commodity
        const commodityRegistry = await getAssetRegistry('org.example.trading.Commodity');
        await commodityRegistry.update(listing.commodity);
    }

    // save the commodity listing
    const commodityListingRegistry = await getAssetRegistry('org.example.trading.CommodityListing');
    await commodityListingRegistry.update(listing);

    if (listing.state === 'SOLD') {
        // save the buyer
        const userRegistry = await getParticipantRegistry('org.example.trading.Member');
        await userRegistry.updateAll([buyer, seller]);
    }
}



/**
 * Track the trade of a commodity from one trader to another
 * @param {org.example.trading.SellToLocalMandi} sellToLocalMandi - selling to local mandi
 * @transaction
 */
async function sellToLocalMandi(comm) { // eslint-disable-line no-unused-vars

    // update information
    
  if(comm.localMandi.qr1 - comm.qs1>=0&&comm.member.tc1 - comm.qs1>=0) {
  
  // update information
  comm.localMandi.qr1=comm.localMandi.qr1 - comm.qs1;
 
  comm.member.tc1=comm.member.tc1 - comm.qs1;

  comm.commodity.cameFrom=comm.member.memberName;
  
  comm.commodity.sendingTo=comm.localMandi.localMandiName;
  
  comm.commodity.priceOfCom=comm.localMandi.p1;
 
  comm.commodity.transferStatus="Transfer Successful";
    
  comm.localMandi.tc1=comm.localMandi.tc1+comm.qs1;
  
 }
 else{
 	
  comm.commodity.transferStatus="Transfer failed";

  comm.commodity.cameFrom="NULL";
  
  comm.commodity.sendingTo="NULL";
 
  comm.commodity.priceOfCom=0;
 
 }
  
  return getParticipantRegistry('org.example.trading.Member')
  	.then(function(memberRegistry) {
    	//update member details
    	return memberRegistry.update(comm.member);
  	})
  	.then(function() {
    	return getParticipantRegistry('org.example.trading.LocalMandi');
  	})
  	.then(function(localMandiRegistry) {
    	//update local mandi details
  		return localMandiRegistry.update(comm.localMandi);
  	})
 		.then(function() {
    	return getAssetRegistry('org.example.trading.Commodity');
  	})
  	.then(function(assetRegistry) {
    	//update commodity details
  		return assetRegistry.update(comm.commodity);
  	});
 
  
   // emit a notification that a trade has occurred
    const transactionNotification = getFactory().newEvent('org.example.trading', 'TransactionNotification');
    transactionNotification.commodity = comm.commodity;
  
    emit(transactionNotification);

    // persist the state of the commodity
    await assetRegistry.update(comm.commodity);
    }



/**
 * Track the trade of a commodity from one trader to another
 * @param {org.example.trading.SellToDestinationMandi} sellToDestinationMandi - selling to destination mandi
 * @transaction
 */
async function sellToDestinationMandi(comm) { // eslint-disable-line no-unused-vars

    // update information
if(comm.destinationMandi.qr1 - comm.qs1>=0&&comm.localMandi.tc1 - comm.qs1>=0) {
  
  // update information
  comm.localMandi.tc1=comm.localMandi.tc1 - comm.qs1;
  
  comm.destinationMandi.qr1=comm.destinationMandi.qr1 - comm.qs1;
  
  comm.commodity.cameFrom=comm.localMandi.localMandiName;
  
  comm.commodity.sendingTo=comm.destinationMandi.destinationMandiName;
  
  comm.commodity.priceOfCom=comm.destinationMandi.p1;

  comm.commodity.transferStatus="Transfer Successful";
  
  comm.destinationMandi.tc1=comm.destinationMandi.tc1+comm.qs1;

 }
 else{
  comm.commodity.transferStatus="Transfer failed";
  
  comm.commodity.cameFrom="NULL";
  
  comm.commodity.sendingTo="NULL";

  comm.commodity.priceOfCom=0;

 }
  
  return getParticipantRegistry('org.example.trading.LocalMandi')
  	.then(function(localMandiRegistry) {
    	//update local mandi details
    	return localMandiRegistry.update(comm.localMandi);
  	})
  	.then(function() {
    	return getParticipantRegistry('org.example.trading.DestinationMandi');
  	})
  	.then(function(destinationMandiRegistry) {
    	//update destination mandi details
  		return destinationMandiRegistry.update(comm.destinationMandi);
  	})
 		.then(function() {
    	return getAssetRegistry('org.example.trading.Commodity');
  	})
  	.then(function(assetRegistry) {
    	//update commodity details
  		return assetRegistry.update(comm.commodity);
  	});
  
   // emit a notification that a trade has occurred
    const transactionNotification = getFactory().newEvent('org.example.trading', 'TransactionNotification');
    transactionNotification.commodity = comm.commodity;
  
    emit(transactionNotification);

    // persist the state of the commodity
    await assetRegistry.update(comm.commodity);
    }


/**
 * Track the trade of a commodity from one trader to another
 * @param {org.example.trading.SellToWholesaler} sellToWholesaler - selling to wholesaler
 * @transaction
 */
async function sellToWholesaler(comm) { // eslint-disable-line no-unused-vars

    // update information
    
if(comm.destinationMandi.tc1 - comm.qs1>=0&&comm.wholesaler.qr1 - comm.qs1>=0) {
  
  // update information
  comm.wholesaler.qr1=comm.wholesaler.qr1 - comm.qs1;
  
  comm.destinationMandi.tc1=comm.destinationMandi.tc1 - comm.qs1;
 
  comm.commodity.cameFrom=comm.destinationMandi.destinationMandiName;

  comm.commodity.sendingTo=comm.wholesaler.wholesalerName;
  
  comm.commodity.priceOfCom=comm.wholesaler.p1;
 
  comm.commodity.transferStatus="Transfer Successful";

  comm.wholesaler.tc1=comm.wholesaler.tc1+comm.qs1;
 
 }
 else{
 
  comm.commodity.transferStatus="Transfer failed";
  
  comm.commodity.cameFrom="NULL";
  
  comm.commodity.sendingTo="NULL";

  comm.commodity.priceOfCom=0;
  
 }
  
  return getParticipantRegistry('org.example.trading.DestinationMandi')
  	.then(function(destinationMandiRegistry) {
    	//update destination mandi details
    	return destinationMandiRegistry.update(comm.destinationMandi);
  	})
  	.then(function() {
    	return getParticipantRegistry('org.example.trading.Wholesaler');
  	})
  	.then(function(wholesalerRegistry) {
    	//update wholesaler details
  		return wholesalerRegistry.update(comm.wholesaler);
  	})
 		.then(function() {
    	return getAssetRegistry('org.example.trading.Commodity');
  	})
  	.then(function(assetRegistry) {
    	//update commodity details
  		return assetRegistry.update(comm.commodity);
  	});
  
   // emit a notification that a trade has occurred
    const transactionNotification = getFactory().newEvent('org.example.trading', 'TransactionNotification');
    transactionNotification.commodity = comm.commodity;
  
    emit(transactionNotification);

    // persist the state of the commodity
    await assetRegistry.update(comm.commodity);
    }









