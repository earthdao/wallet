import React from 'react';
import styles from './index.scss';
import { useHistory } from 'react-router-dom';
import { RouteComponentProps, withRouter } from 'react-router';
import Header from '~components/Header';
//import { useSelector } from 'react-redux';
import { keyable } from '~scripts/Background/types/IMainController';
//import { selectAssetById } from '~state/wallet';
import { getTokenCollectionInfo, getTokenImageURL } from '~global/nfts';
import clsx from 'clsx';
//import { useController } from '~hooks/useController';
//import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import useQuery from '~hooks/useQuery';
import { decodeTokenId } from '@earthwallet/assets';
import useToast from '~hooks/useToast';
import { useSelector } from 'react-redux';
import { selectBalanceByAddress } from '~state/wallet';


interface Props extends RouteComponentProps<{ nftId: string }> {
    className?: string;
}

const NFTBuyDetails = ({
    match: {
        params: {
            nftId,
        },
    },
}: Props) => {
    const queryParams = useQuery();
    const price: number = parseInt(queryParams.get('price') || '');
    const address: string = queryParams.get('address') || '';
    const history = useHistory();
    const currentBalance: keyable = useSelector(selectBalanceByAddress(address));

    const canisterId = decodeTokenId(nftId).canister;
    const index = decodeTokenId(nftId).index;

    const asset: keyable = { canisterId, id: nftId, tokenIdentifier: nftId };
    const { show } = useToast();
    const buy = () => {
        console.log(currentBalance?.value)
        if (1 != 1 && currentBalance?.value < price) {
            show('Not Enough Balance');
        }
        else {
            history.push(`/nft/settle/${nftId}?price=${price}&address=${address}`);
        }
    };
    return (
        <div className={styles.page}>
            <div className={styles.stickyheader}>
                <Header
                    showBackArrow
                    text={('')}
                    type={'wallet'}
                ></Header>
            </div>
            <div className={styles.fullImage}
                style={{ backgroundImage: `url(${getTokenImageURL(asset)})` }} >
                <div className={styles.actions}>
                    <div

                        onClick={() => buy()}
                        className={clsx(styles.action, styles.secAction)}>Buy</div>
                </div>
            </div>
            <div className={styles.mainCont}>
                <div className={styles.transCont}>
                    <div className={styles.title}>{index}</div>
                    <div className={styles.subtitleCont}>
                        <div className={styles.subtitle}>For sale</div>
                        {<div className={styles.price}>{(price / 100000000).toFixed(3)} ICP</div>}
                    </div>
                    <div className={styles.sep}></div>
                    <div className={styles.creatorCont}>
                        <img src={getTokenCollectionInfo(canisterId)?.icon} className={styles.creatorIcon}></img>
                        <div className={styles.creatorInfo}>
                            <div className={styles.creatorTitle}>{getTokenCollectionInfo(canisterId)?.name}</div>
                            <div className={styles.creatorSubtitle}>{getTokenCollectionInfo(canisterId)?.description}</div>
                        </div>
                    </div>
                </div>
            </div>

        </div >
    );
};

export default withRouter(NFTBuyDetails);
