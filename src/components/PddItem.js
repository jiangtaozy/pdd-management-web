/*
 * Maintained by jemo from 2020.5.24 to now
 * Created by jemo on 2020.5.24 10:17:02
 * Pdd Item
 * 拼多多商品
 */

import React, { useState, useEffect } from 'react';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Snackbar from '@material-ui/core/Snackbar';
import axios from 'axios';
import tableIcons from './utils/TableIcons';
import MaterialTable from 'material-table';
import { Link as RouterLink } from 'react-router-dom';
import Link from '@material-ui/core/Link';
import { CopyToClipboard } from 'react-copy-to-clipboard';

function PddItem() {

  const [ pddGoodsData, setPddGoodsData ] = useState('');
  const [ snackbarState, setSnackbarState ] = useState({
    message: '',
    open: false,
  })
  const [ pddGoodsList, setPddGoodsList ] = useState([]);

  const { message, open } = snackbarState;
  const [ selectedRow, setSelectedRow ] = useState();

  async function handlePddGoodsDataButtonClick() {
    if(!pddGoodsData) {
      return handleOpenSnackbar({
        message: '请输入数据',
      });
    }
    try {
      await axios.post('/uploadPddItemData', {
        pddGoodsData,
      });
      handleOpenSnackbar({
        message: '操作成功',
      });
      setPddGoodsData('');
      fetchPddGoods();
    }
    catch(err) {
      console.error('PddItemUploadPddItemDataError: ', err);
      handleOpenSnackbar({
        message: `出错了：${err.message}`,
      });
    }
  }

  const handleOpenSnackbar = ({message}) => {
    setSnackbarState({
      message,
      open: true,
    })
  }

  const handleCloseSnackbar = () => {
    setSnackbarState({
      open: false,
    });
  }

  useEffect(() => {
    fetchPddGoods();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPddGoods = async () => {
    try {
      const { data: priceData } = await axios.get('/pddItemPriceHistoryData');
      const { data } = await axios.get('/pddGoods');
      for(let i = 0; i < data.length; i++) {
        let {
          suitPrice,
          skuGroupPriceMax,
        } = data[i];
        const price = skuGroupPriceMax / 100;
        // 运费(5.5) + 售价 + 运费险(约 6 元) + 服务费(0.6%)
        const costPrice = Math.round((5.5 + suitPrice + 6 + price * 0.006) * 100) / 100;
        const profit = Math.round((price - costPrice) * 100) / 100;
        data[i].costPrice = costPrice;
        data[i].profit = profit;
        data[i].conversionThreshold = Math.round(0.1 / profit * 100 * 100) / 100;
        data[i].profitMargin = Math.round(profit / price * 100 * 100) / 100;
        //data[i].promotionProfit = Math.round(((price - 10) * (1 - 0.33) - costPrice) * 100) / 100;
        //data[i].limitDiscount = Math.round((1 - profit / price) * 10 * 100) / 100;
        data[i].sellPrice = Math.round((suitPrice + 5.5 + 6) / (1 - 0.287 - 0.006));
        const adList = data[i].adList || [];
        let impression = 0;
        let click = 0;
        let spend = 0;
        for(let i = 0; i < adList.length; i++) {
          const ad = adList[i];
          impression += ad.impression;
          click += ad.click;
          spend += ad.spend;
        }
        data[i].impression = impression;
        data[i].click = click;
        data[i].spend = spend / 1000;
        data[i].ctr = impression ? (click / impression).toFixed(4) : 0;
        const orderList = data[i].orderList || [];
        let orderProfit = 0;
        let totalOrderNum = 0;
        let realOrderNum = 0;
        for(let j = 0; j < orderList.length; j++) {
          const order = orderList[j];
          const {
            orderStatus,
            afterSaleStatus,
            actualPayment,
            platformDiscount,
            userPaidAmount,
          } = order;
          if(orderStatus === 1) {
            totalOrderNum++;
            if(!afterSaleStatus) {
              orderProfit += (platformDiscount + userPaidAmount) / 100 - actualPayment;
              realOrderNum++;
            }
          }
        }
        data[i].orderProfit = Math.round(orderProfit * 100) / 100;
        data[i].netProfit = Math.round((orderProfit - spend / 1000) * 100) / 100;
        data[i].perClickProfit = Math.round((orderProfit / click || 0) * 100) / 100;
        data[i].perClickSpend = Math.round((spend / 1000 / click || 0) * 100) / 100;
        data[i].perClickProfitSpend = 0;
        data[i].netProfitSpend = 0;
        data[i].totalOrderNum = totalOrderNum;
        data[i].realOrderNum = realOrderNum;
        data[i].afterSaleRate = totalOrderNum ? (totalOrderNum - realOrderNum) / totalOrderNum : 0;
        if(spend !== 0) {
          data[i].perClickProfitSpend = Math.round((orderProfit / (spend / 1000)) * 100) / 100;
          data[i].netProfitSpend = Math.round((orderProfit / (spend / 1000) - 1) * 100) / 100;
        }
        //data[i].orderProfitPriceDiff = Math.round(costPrice / (0.9 - 0.01 * realOrderNum) - price)
      }
      let { data: list } = await axios.get('/pddItemLastThreeDayPromoteList');
      if(!list) {
        list = [];
      }
      for(let i = 0; i < data.length; i++) {
        data[i].isPromote = false;
        for(let j = 0; j < list.length; j++) {
          if(list[j].goodsId === data[i].pddId) {
            data[i].isPromote = true;
            break;
          }
        }
        for(let k = 0; k < priceData.length; k++) {
          if(priceData[k].pddId === data[i].pddId) {
            data[i].afterChangePriceGoodsPv = priceData[k].afterChangePriceGoodsPv;
            data[i].payOrdrCnt = priceData[k].payOrdrCnt;
            break;
          }
        }
      }
      setPddGoodsList(data);
    }
    catch(err) {
      console.error('pdd-item-fetch-pdd-goods-error: ', err);
      handleOpenSnackbar({
        message: `出错了：${err.message}`,
      });
    }
  };

  const [ columns ] = useState([
    {
      title: "商品信息",
      field: 'goodsName',
      render: rowData => {
        const {
          thumbUrl,
          pddId,
          goodsInfoScr,
          goodsName,
          outGoodsSn,
          isOnsale,
          name,
          detailUrl,
          keyName,
        } = rowData;
        return (
          <div style={{
            display: 'flex',
            width: 200,
          }}>
            <div>
              <img alt=""
                src={thumbUrl}
                style={{
                  width: 50,
                  height: 50,
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              marginLeft: 10,
              fontSize: 12,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <div style={{
                  color: '#666',
                }}>
                  <CopyToClipboard
                    text={pddId}
                    onCopy={() =>
                      handleOpenSnackbar({
                        message: '已复制',
                      })
                    }>
                    <Button
                      variant='outlined'
                      size='small'>
                      {pddId}
                    </Button>
                  </CopyToClipboard>
                </div>
                <div>
                  {goodsInfoScr}
                </div>
              </div>
              <div>
                {goodsName}
              </div>
              <div style={{
                color: '#666',
              }}>
                <RouterLink to={`/product/select/${outGoodsSn}`}>
                  商品编码：{outGoodsSn}
                </RouterLink>
              </div>
              <div>
                <Link
                  href={detailUrl}
                  target="_blank">
                  {name}
                </Link>
              </div>
              {!isOnsale ?
                <div
                  style={{
                    color: 'red',
                  }}>
                  已下架
                </div> : null
              }
              <div style={{
                color: '#eb4d4b',
              }}>
                <RouterLink
                  to={`/product/data/${pddId}`}
                  style={{
                    color: '#eb4d4b',
                  }}>
                  商品数据
                </RouterLink>
              </div>
              <div style={{
                color: '#666',
              }}>
                <RouterLink to={`/pddCompetitorItem/${pddId}`}>
                  竞争对手商品
                </RouterLink>
              </div>
              <div>
                {keyName}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: '售价',
      field: 'skuGroupPriceMin',
      headerStyle: {
        color: '#3333FF',
      },
      render: rowData => {
        const {
          skuGroupPriceMin,
          skuGroupPriceMax,
          costPrice,
          profit,
          suitPrice,
          //realOrderNum,
        } = rowData;
        var currentPrice = skuGroupPriceMin / 100;
        if(skuGroupPriceMin !== skuGroupPriceMax) {
          currentPrice = `${currentPrice}-${skuGroupPriceMax / 100}`;
        }
        return (
          <div
            style={{
              fontSize: 10,
              width: 120,
            }}>
            <div
              style={{
                color: '#3333FF',
              }}>
              售价：<span style={{fontSize: 14, fontWeight: 'bold'}}>{currentPrice}</span>
            </div>
            <div
              style={{
                color: '#17A589',
              }}>
              成本价：<span style={{fontSize: 14, fontWeight: 'bold'}}>{suitPrice}</span>
            </div>
            <div
              style={{
                color: '#17A589',
              }}>
              运费发货费、运费险、服务费：<span style={{fontSize: 14, fontWeight: 'bold'}}>{Math.round((5.5 + 6 + currentPrice * 0.006) * 100) / 100}</span>
            </div>
            <div
              style={{
                color: '#17A589',
              }}>
              总成本：<span style={{fontSize: 14, fontWeight: 'bold'}}>{costPrice}</span>
            </div>
            <div
              style={{
                color: '#d63031',
              }}>
              利润：<span style={{fontSize: 14, fontWeight: 'bold'}}>{profit}</span>
            </div>
            <div
              style={{
                color: '#2ed573',
              }}>
              利润率：<span style={{fontSize: 14, fontWeight: 'bold'}}>{(profit / currentPrice * 100).toFixed(1)}%</span>
            </div>
            {/*
            <div
              style={{
                color: '#eb2f06',
              }}>
              毛利润20%售价：<span style={{fontSize: 14, fontWeight: 'bold'}}>{Math.round(costPrice / (1 - 0.006 - 0.2))}</span>
            </div>
            */}
            <div
              style={{
                color: '#EA2027',
              }}>
              阈值ROI：<span style={{fontSize: 14, fontWeight: 'bold'}}>{Math.round(currentPrice / profit * 100) / 100}</span>
            </div>
            {/*
            <div
              style={{
                color: '#EA2027',
              }}>
              订单-利润率价格：<span style={{fontSize: 14, fontWeight: 'bold'}}>{Math.round(costPrice / (0.9 - 0.01 * realOrderNum))}</span>
            </div>
            */}
          </div>
        );
      },
    },
    {
      title: '总订单量',
      field: 'totalOrderNum',
      type: 'numeric',
      cellStyle: {
        fontSize: 12,
        color: '#ff0000',
      },
      headerStyle: {
        color: '#ff0000',
      },
    },
    {
      title: '无售后订单量',
      field: 'realOrderNum',
      type: 'numeric',
      cellStyle: {
        fontSize: 12,
        color: '#ff0000',
      },
      headerStyle: {
        color: '#ff0000',
      },
    },
    {
      title: '退货率',
      field: 'afterSaleRate',
      type: 'numeric',
      cellStyle: {
        fontSize: 12,
        color: '#ff0000',
      },
      headerStyle: {
        color: '#ff0000',
      },
    },
    /*
    {
      title: '订单-利润率价格差',
      field: 'orderProfitPriceDiff',
      type: 'numeric',
      cellStyle: {
        fontSize: 12,
        color: '#2ed573',
      },
      headerStyle: {
        color: '#2ed573',
      },
    },
    */
    {
      title: '利润率',
      field: 'profitMargin',
      cellStyle: {
        fontSize: 12,
        color: '#2ed573',
      },
      headerStyle: {
        color: '#2ed573',
      },
      render: rowData => {
        const {
          profitMargin,
          sellPrice,
        } = rowData;
        const bidPrice = Math.round(sellPrice * 0.187);
        return (
          <div>
            {profitMargin}%
            <CopyToClipboard
              text={sellPrice}
              onCopy={() =>
                handleOpenSnackbar({
                  message: '已复制',
                })
              }>
              <Button
                variant='outlined'
                size='small'>
                售价:{sellPrice}
              </Button>
            </CopyToClipboard>
            <CopyToClipboard
              text={bidPrice}
              onCopy={() =>
                handleOpenSnackbar({
                  message: '已复制',
                })
              }>
              <Button
                variant='outlined'
                size='small'>
                出价:{bidPrice}
              </Button>
            </CopyToClipboard>
          </div>
        );
      },
    },
    /*
    {
      title: '利润率10%售价',
      field: 'profit10price',
      cellStyle: {
        fontSize: 12,
        color: 'red',
      },
      headerStyle: {
        color: 'red',
      },
      render: rowData => {
        const {
          costPrice,
        } = rowData;
        const profitTenPrice = Math.round(costPrice / (1 - 0.006 - 0.1));
        return (
          <div>
            <CopyToClipboard
              text={profitTenPrice}
              onCopy={() =>
                handleOpenSnackbar({
                  message: '已复制',
                })
              }>
              <div>
                {profitTenPrice}
              </div>
            </CopyToClipboard>
          </div>
        );
      },
    },
    */
    /*
    {
      title: '降低5%利润率折扣',
      field: 'priceOfFivePercent',
      cellStyle: {
        fontSize: 12,
        color: '#2ed573',
      },
      headerStyle: {
        color: '#2ed573',
      },
      render: rowData => {
        const {
          skuGroupPriceMin,
          costPrice,
        } = rowData;
        var currentPrice = skuGroupPriceMin / 100;
        return (
          <div>
            <div>{Math.round(costPrice/(costPrice/currentPrice + 0.05))}元</div>
            <div>降幅{Math.round((1 - costPrice/(costPrice/currentPrice + 0.05)/currentPrice)*100)}%</div>
            <div><span style={{fontSize: 20, color: 'red'}}>{Math.round((costPrice/(costPrice/currentPrice + 0.05)/currentPrice)*100)/10}</span>折</div>
          </div>
        );
      },
    },
    */
    {
      title: '商品名称',
      field: 'name',
      cellStyle: {
        fontSize: 12,
        color: '#9B59B6',
      },
      headerStyle: {
        color: '#9B59B6',
      },
    },
    {
      title: '女装网货号',
      field: 'keyName',
      cellStyle: {
        fontSize: 12,
        color: '#9B59B6',
      },
      headerStyle: {
        color: '#9B59B6',
      },
    },
    {
      title: '净利润',
      field: 'netProfit',
      type: 'numeric',
      cellStyle: {
        fontSize: 12,
        color: '#ff0000',
      },
      headerStyle: {
        color: '#ff0000',
      },
    },
    {
      title: '净利润花费比',
      field: 'netProfitSpend',
      type: 'numeric',
      cellStyle: {
        fontSize: 12,
        color: '#ff0000',
      },
      headerStyle: {
        color: '#ff0000',
      },
    },
    {
      title: '曝光量',
      field: 'impression',
      cellStyle: {
        fontSize: 12,
        color: '#3498db',
      },
      headerStyle: {
        color: '#3498db',
      },
      render: rowData => {
        const {
          impression,
          click,
          ctr,
          spend,
        } = rowData;
        return (
          <div>
            <div>
              曝光量：{impression}
            </div>
            <div>
              点击量：{click}
            </div>
            <div>
              点击率：{ctr}
            </div>
            <div>
              花费：{spend}
            </div>
          </div>
        );
      },
    },
    {
      title: '订单利润',
      field: 'orderProfit',
      cellStyle: {
        fontSize: 12,
        color: '#f1c40f',
      },
      headerStyle: {
        color: '#f1c40f',
      },
      render: rowData => {
        const {
          orderProfit,
          totalOrderNum,
          realOrderNum,
          afterSaleRate,
        } = rowData;
        return (
          <div>
            <div>
              订单利润：{orderProfit}
            </div>
            <div>
              总订单量：{totalOrderNum}
            </div>
            <div>
              无售后订单量：{realOrderNum}
            </div>
            <div>
              退货率：{Math.round(afterSaleRate * 100 * 100) / 100}%
            </div>
          </div>
        );
      },
    },
    {
      title: '总浏览量',
      field: 'goodsPv',
      cellStyle: {
        fontSize: 12,
        color: '#EC7063',
      },
      headerStyle: {
        color: '#EC7063',
      },
    },
    /*
    {
      title: '改价后浏览量',
      field: 'afterChangePriceGoodsPv',
      cellStyle: {
        fontSize: 12,
        color: '#c0392b',
      },
      headerStyle: {
        color: '#c0392b',
      },
    },
    {
      title: '改价后订单量',
      field: 'payOrdrCnt',
      cellStyle: {
        fontSize: 12,
        color: '#c0392b',
      },
      headerStyle: {
        color: '#c0392b',
      },
    },
    */
    {
      title: '商品id',
      field: 'pddId',
      cellStyle: {
        fontSize: 12,
        color: '#EC7063',
      },
      headerStyle: {
        color: '#EC7063',
      },
    },
    {
      title: '商品编码',
      field: 'outGoodsSn',
      cellStyle: {
        fontSize: 12,
        color: '#9B59B6',
      },
      headerStyle: {
        color: '#9B59B6',
      },
    },
    {
      title: '是否云仓',
      field: 'isCloudWarehouse',
      type: 'boolean',
      cellStyle: {
        fontSize: 12,
        color: '#9B59B6',
      },
      headerStyle: {
        color: '#9B59B6',
      },
    },
    {
      title: '女装网id',
      field: 'womenProductId',
      type: 'numeric',
      cellStyle: {
        fontSize: 12,
        color: '#9B59B6',
      },
      headerStyle: {
        color: '#9B59B6',
      },
    },
    {
      title: "获取数据",
      field: "getData",
      render: rowData => {
        const {
          detailUrl,
          outGoodsSn,
          womenProductId,
        } = rowData;
        return (
          <div>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              style={{
                marginTop: 10,
              }}
              onClick={async () => {
                try {
                  const { data } = await axios.post('/getWomenDetailData', {
                    id: parseInt(outGoodsSn),
                    detailUrl,
                  });
                  if(data === 'ok') {
                    handleOpenSnackbar({
                      message: '操作成功',
                    })
                  } else {
                    handleOpenSnackbar({
                      message: `出错了：${data}`,
                    })
                  }
                }
                catch(err) {
                  console.error('SearchItemGetDataError: ', err);
                  handleOpenSnackbar({
                    message: `出错了：${err.message}`,
                  })
                }
              }}>
              获取数据
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              style={{
                marginTop: 10,
              }}
              onClick={async () => {
                try {
                  const { data } = await axios.post('/getWomenCloudWarehouseStock', {
                    id: parseInt(outGoodsSn),
                    womenProductId: womenProductId,
                  });
                  if(data === 'ok') {
                    handleOpenSnackbar({
                      message: '操作成功',
                    })
                  } else {
                    handleOpenSnackbar({
                      message: `出错了：${data}`,
                    })
                  }
                }
                catch(err) {
                  console.error('SearchItemGetWomenCloudWarehouseStockError: ', err);
                  handleOpenSnackbar({
                    message: `出错了：${err.response && err.response.data}`,
                  })
                }
              }}>
              获取库存
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              style={{
                marginTop: 10,
              }}
              onClick={async () => {
                try {
                  const { data } = await axios.post('/getWomenImage', {
                    id: parseInt(outGoodsSn),
                    womenProductId: womenProductId,
                  });
                  if(data === 'ok') {
                    handleOpenSnackbar({
                      message: '操作成功',
                    })
                  } else {
                    handleOpenSnackbar({
                      message: `出错了：${data}`,
                    })
                  }
                }
                catch(err) {
                  console.error('PddItem.js-GetWomenImageError: ', err);
                  handleOpenSnackbar({
                    message: `出错了：${err.message}`,
                  })
                }
              }}>
              下载主图
            </Button>
          </div>
        );
      },
    },
    {
      title: '是否推广',
      field: 'isPromote',
      type: 'boolean',
      cellStyle: {
        fontSize: 12,
        color: '#9B59B6',
      },
      headerStyle: {
        color: '#9B59B6',
      },
    },
    {
      title: '是否在售',
      field: 'isOnsale',
      type: 'boolean',
      defaultFilter: "checked",
      cellStyle: {
        fontSize: 12,
        color: '#9B59B6',
      },
      headerStyle: {
        color: '#9B59B6',
      },
    },
  ]);

  return (
    <div>
      <MaterialTable
        icons={tableIcons}
        options={{
          filtering: true,
          searchFieldAlignment: 'left',
          rowStyle: rowData => ({
            backgroundColor: (selectedRow && selectedRow.tableData.id === rowData.tableData.id) ? '#EEE' : '#fff',
          }),
        }}
        data={pddGoodsList}
        title="拼多多商品列表"
        onRowClick={((evt, selectedRow) => setSelectedRow(selectedRow))}
        columns={columns}
      />
      <TextField
        label="输入拼多多商品数据(/goodsList)"
        multiline
        fullWidth
        value={pddGoodsData}
        onChange={(event) => {
          setPddGoodsData(event.target.value)
        }}
      />
      <Button
        variant="outlined"
        color="primary"
        fullWidth={true}
        style={{
          marginTop: 10,
        }}
        onClick={handlePddGoodsDataButtonClick}
      >
        确定
      </Button>
      <Snackbar
        anchorOrigin={{
          horizontal: "center",
          vertical: "top",
        }}
        autoHideDuration={2000}
        open={open}
        onClose={handleCloseSnackbar}
        message={message}
      />
    </div>
  );
}

export default PddItem;
